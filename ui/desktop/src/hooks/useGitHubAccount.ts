import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { acpReadConfig, acpRemoveConfig, acpUpsertConfig } from '../acp/config';
import { errorMessage } from '../utils/conversionUtils';
import { setBundledGitHubExtensionEnabled } from '../utils/githubExtension';
import {
  describeGitHubSignInError,
  GITHUB_SLOW_DOWN_BACKOFF_SECS,
  GITHUB_TOKEN_CONFIG_KEY,
  githubSignInBrowserUrl,
  type GitHubTokenPollResult,
} from '../utils/githubSignIn';
import { defineMessages, useIntl } from '../i18n';

const i18n = defineMessages({
  githubSignedIn: {
    id: 'authSettings.githubSignedIn',
    defaultMessage: 'Signed in to GitHub. The GitHub extension is ready to use.',
  },
  githubSignedOut: {
    id: 'authSettings.githubSignedOut',
    defaultMessage: 'Signed out of GitHub',
  },
  githubSignInFailed: {
    id: 'authSettings.githubSignInFailed',
    defaultMessage: 'GitHub sign-in failed: {error}',
  },
  githubSignInUnavailable: {
    id: 'authSettings.githubSignInUnavailable',
    defaultMessage: 'GitHub sign-in is only available in the desktop app.',
  },
  githubStatusFailed: {
    id: 'authSettings.githubStatusFailed',
    defaultMessage: 'Could not check GitHub sign-in status',
  },
  githubBrowserOpenFailed: {
    id: 'authSettings.githubBrowserOpenFailed',
    defaultMessage: 'Could not open the browser. Use Open GitHub again.',
  },
});

export type GitHubConnectionStatus = 'checking' | 'connected' | 'disconnected';

export type GitHubFlowState = {
  deviceCode: string;
  userCode: string;
  browserUrl: string;
  intervalMs: number;
  deadlineMs: number;
};

export type UseGitHubAccountOptions = {
  onConnected?: () => void | Promise<void>;
  onDisconnected?: () => void | Promise<void>;
};

async function openGitHubInBrowser(url: string): Promise<boolean> {
  if (!window.electron?.openExternal) {
    return false;
  }
  try {
    const result = await window.electron.openExternal(url);
    return result === 'opened';
  } catch {
    return false;
  }
}

export function useGitHubAccount(options: UseGitHubAccountOptions = {}) {
  const intl = useIntl();
  const [status, setStatus] = useState<GitHubConnectionStatus>('checking');
  const [flow, setFlow] = useState<GitHubFlowState | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [browserOpenFailed, setBrowserOpenFailed] = useState(false);
  const flowRef = useRef<GitHubFlowState | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const onConnectedRef = useRef(options.onConnected);
  const onDisconnectedRef = useRef(options.onDisconnected);
  onConnectedRef.current = options.onConnected;
  onDisconnectedRef.current = options.onDisconnected;

  const checkStatus = useCallback(async () => {
    try {
      const secret = await acpReadConfig(GITHUB_TOKEN_CONFIG_KEY, true);
      setStatus(secret == null ? 'disconnected' : 'connected');
    } catch {
      setStatus('disconnected');
      toast.error(intl.formatMessage(i18n.githubStatusFailed));
    }
  }, [intl]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    flowRef.current = null;
    setFlow(null);
    setBrowserOpenFailed(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const openBrowserAgain = useCallback(async () => {
    const current = flowRef.current;
    if (!current) {
      return;
    }
    const opened = await openGitHubInBrowser(current.browserUrl);
    setBrowserOpenFailed(!opened);
    if (!opened) {
      toast.error(intl.formatMessage(i18n.githubBrowserOpenFailed));
    }
  }, [intl]);

  const pollDevice = useCallback(
    async (current: GitHubFlowState) => {
      if (flowRef.current !== current) {
        return;
      }
      if (Date.now() >= current.deadlineMs) {
        stopPolling();
        toast.error(describeGitHubSignInError('expired_token'));
        return;
      }

      let result: GitHubTokenPollResult;
      try {
        result = await window.electron.githubDevicePoll(current.deviceCode);
      } catch (error) {
        stopPolling();
        toast.error(
          intl.formatMessage(i18n.githubSignInFailed, {
            error: errorMessage(error, 'network request failed'),
          })
        );
        return;
      }

      if (flowRef.current !== current) {
        return;
      }

      switch (result.status) {
        case 'ok': {
          stopPolling();
          try {
            await acpUpsertConfig(GITHUB_TOKEN_CONFIG_KEY, result.accessToken, true);
            await setBundledGitHubExtensionEnabled(true);
            setStatus('connected');
            toast.success(intl.formatMessage(i18n.githubSignedIn));
            await onConnectedRef.current?.();
          } catch (error) {
            toast.error(
              intl.formatMessage(i18n.githubSignInFailed, {
                error: errorMessage(error, 'failed to store credentials'),
              })
            );
          }
          return;
        }
        case 'pending': {
          pollTimerRef.current = window.setTimeout(
            () => void pollDevice(current),
            current.intervalMs
          );
          return;
        }
        case 'slow_down': {
          current.intervalMs += GITHUB_SLOW_DOWN_BACKOFF_SECS * 1000;
          pollTimerRef.current = window.setTimeout(
            () => void pollDevice(current),
            current.intervalMs
          );
          return;
        }
        case 'error': {
          stopPolling();
          toast.error(describeGitHubSignInError(result.error));
          return;
        }
      }
    },
    [intl, stopPolling]
  );

  const startSignIn = useCallback(async () => {
    if (!window.electron?.githubDeviceStart || !window.electron?.githubDevicePoll) {
      toast.error(intl.formatMessage(i18n.githubSignInUnavailable));
      return;
    }
    try {
      const device = await window.electron.githubDeviceStart();
      const browserUrl = githubSignInBrowserUrl(device);
      const next: GitHubFlowState = {
        deviceCode: device.deviceCode,
        userCode: device.userCode,
        browserUrl,
        intervalMs: Math.max(device.interval, 1) * 1000,
        deadlineMs: Date.now() + device.expiresIn * 1000,
      };
      flowRef.current = next;
      setFlow(next);
      const opened = await openGitHubInBrowser(browserUrl);
      setBrowserOpenFailed(!opened);
      if (!opened) {
        toast.error(intl.formatMessage(i18n.githubBrowserOpenFailed));
      }
      pollTimerRef.current = window.setTimeout(() => void pollDevice(next), next.intervalMs);
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.githubSignInFailed, {
          error: errorMessage(error, 'request failed'),
        })
      );
    }
  }, [intl, pollDevice]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await acpRemoveConfig(GITHUB_TOKEN_CONFIG_KEY, true);
      await setBundledGitHubExtensionEnabled(false);
      setStatus('disconnected');
      toast.success(intl.formatMessage(i18n.githubSignedOut));
      await onDisconnectedRef.current?.();
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.githubSignInFailed, {
          error: errorMessage(error, 'failed to remove credentials'),
        })
      );
    } finally {
      setSigningOut(false);
    }
  }, [intl]);

  return {
    status,
    flow,
    signingOut,
    browserOpenFailed,
    checkStatus,
    startSignIn,
    stopPolling,
    openBrowserAgain,
    signOut,
  };
}
