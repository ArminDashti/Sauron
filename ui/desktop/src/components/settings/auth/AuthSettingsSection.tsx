import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleCheck,
  Github,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  acpAuthenticateProvider,
  acpDeleteProviderSecret,
  acpListProviderSecrets,
  type ProviderSecretDto,
} from '../../../acp/providers';
import { acpReadConfig, acpRemoveConfig, acpUpsertConfig } from '../../../acp/config';
import { getConfiguredExtensions, setConfigExtensionEnabled } from '../../../acp/extensions';
import { nameToKey } from '../extensions/utils';
import {
  describeGitHubSignInError,
  GITHUB_SLOW_DOWN_BACKOFF_SECS,
  GITHUB_TOKEN_CONFIG_KEY,
  type GitHubTokenPollResult,
} from '../../../utils/githubSignIn';
import { errorMessage } from '../../../utils/conversionUtils';
import { useModelAndProvider } from '../../ModelAndProviderContext';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  title: {
    id: 'authSettings.title',
    defaultMessage: 'Provider Credentials',
  },
  description: {
    id: 'authSettings.description',
    defaultMessage: 'Manage provider credentials stored locally by goose.',
  },
  loading: {
    id: 'authSettings.loading',
    defaultMessage: 'Loading credentials...',
  },
  empty: {
    id: 'authSettings.empty',
    defaultMessage: 'No locally stored provider credentials were found.',
  },
  failedToLoad: {
    id: 'authSettings.failedToLoad',
    defaultMessage: 'Failed to load provider credentials',
  },
  deleteTitle: {
    id: 'authSettings.deleteTitle',
    defaultMessage: 'Delete credential',
  },
  deleteMessage: {
    id: 'authSettings.deleteMessage',
    defaultMessage: 'Delete the {name} credential for {provider}?',
  },
  activeProviderWarning: {
    id: 'authSettings.activeProviderWarning',
    defaultMessage:
      'This is the active provider. New requests may fail until you configure another credential.',
  },
  delete: {
    id: 'authSettings.delete',
    defaultMessage: 'Delete',
  },
  cancel: {
    id: 'authSettings.cancel',
    defaultMessage: 'Cancel',
  },
  deleted: {
    id: 'authSettings.deleted',
    defaultMessage: 'Credential deleted',
  },
  failedToDelete: {
    id: 'authSettings.failedToDelete',
    defaultMessage: 'Failed to delete credential: {error}',
  },
  storageSecretStore: {
    id: 'authSettings.storageSecretStore',
    defaultMessage: 'Secret store',
  },
  storageProviderCache: {
    id: 'authSettings.storageProviderCache',
    defaultMessage: 'Provider cache',
  },
  expiresAt: {
    id: 'authSettings.expiresAt',
    defaultMessage: 'Expires {date}',
  },
  deleteCredential: {
    id: 'authSettings.deleteCredential',
    defaultMessage: 'Delete credential',
  },
  signIn: {
    id: 'authSettings.signIn',
    defaultMessage: 'Sign in',
  },
  reauthorize: {
    id: 'authSettings.reauthorize',
    defaultMessage: 'Reauthorize',
  },
  signedIn: {
    id: 'authSettings.signedIn',
    defaultMessage: 'Credential configured',
  },
  failedToConfigure: {
    id: 'authSettings.failedToConfigure',
    defaultMessage: 'Failed to configure credential: {error}',
  },
  connectedAccounts: {
    id: 'authSettings.connectedAccounts',
    defaultMessage: 'Connected accounts',
  },
  connectedAccountsDescription: {
    id: 'authSettings.connectedAccountsDescription',
    defaultMessage: 'Sign in to let Sauron work with your external accounts.',
  },
  githubAccountName: {
    id: 'authSettings.githubAccountName',
    defaultMessage: 'GitHub',
  },
  githubAccountDescription: {
    id: 'authSettings.githubAccountDescription',
    defaultMessage: 'Search repositories, work with code, manage issues, and open pull requests.',
  },
  checkingStatus: {
    id: 'authSettings.checkingStatus',
    defaultMessage: 'Checking...',
  },
  githubConnected: {
    id: 'authSettings.githubConnected',
    defaultMessage: 'Connected',
  },
  githubNotConnected: {
    id: 'authSettings.githubNotConnected',
    defaultMessage: 'Not connected',
  },
  signInWithGitHub: {
    id: 'authSettings.signInWithGitHub',
    defaultMessage: 'Sign in with GitHub',
  },
  signOutFromGitHub: {
    id: 'authSettings.signOutFromGitHub',
    defaultMessage: 'Sign out',
  },
  githubWaitingForAuthorization: {
    id: 'authSettings.githubWaitingForAuthorization',
    defaultMessage: 'Waiting for GitHub authorization...',
  },
  githubEnterCode: {
    id: 'authSettings.githubEnterCode',
    defaultMessage: 'Enter this code at {url} to authorize Sauron:',
  },
  githubOpenDevicePage: {
    id: 'authSettings.githubOpenDevicePage',
    defaultMessage: 'Open the GitHub device page',
  },
  cancelSignIn: {
    id: 'authSettings.cancelSignIn',
    defaultMessage: 'Cancel',
  },
  githubSignedIn: {
    id: 'authSettings.githubSignedIn',
    defaultMessage: 'Signed in to GitHub. The GitHub extension is ready to use.',
  },
  githubSignedOut: {
    id: 'authSettings.githubSignedOut',
    defaultMessage: 'Signed out of GitHub',
  },
  githubSignOutTitle: {
    id: 'authSettings.githubSignOutTitle',
    defaultMessage: 'Sign out of GitHub',
  },
  githubSignOutMessage: {
    id: 'authSettings.githubSignOutMessage',
    defaultMessage:
      'Sauron will no longer be able to work with your GitHub repositories until you sign in again.',
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
});

function storageLabel(secret: ProviderSecretDto, intl: ReturnType<typeof useIntl>) {
  if (secret.storage === 'provider_cache') {
    return intl.formatMessage(i18n.storageProviderCache);
  }
  return intl.formatMessage(i18n.storageSecretStore);
}

function expiryLabel(secret: ProviderSecretDto, intl: ReturnType<typeof useIntl>) {
  if (!secret.expiresAt) {
    return null;
  }
  return intl.formatMessage(i18n.expiresAt, {
    date: intl.formatDate(new Date(secret.expiresAt), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  });
}

function expiryClass(secret: ProviderSecretDto) {
  if (secret.status === 'expired') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }
  return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
}

type GitHubFlowState = {
  deviceCode: string;
  userCode: string;
  verificationUriComplete: string | null;
  intervalMs: number;
  deadlineMs: number;
};

export default function AuthSettingsSection() {
  const intl = useIntl();
  const { currentProvider } = useModelAndProvider();
  const [secrets, setSecrets] = useState<ProviderSecretDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [secretToDelete, setSecretToDelete] = useState<ProviderSecretDto | null>(null);
  const [githubStatus, setGithubStatus] = useState<'checking' | 'connected' | 'disconnected'>(
    'checking'
  );
  const [githubFlow, setGithubFlow] = useState<GitHubFlowState | null>(null);
  const [showGitHubSignOut, setShowGitHubSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const githubFlowRef = useRef<GitHubFlowState | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const loadSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const secrets = await acpListProviderSecrets();
      setSecrets(secrets);
    } catch {
      toast.error(intl.formatMessage(i18n.failedToLoad));
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const confirmDelete = async () => {
    if (!secretToDelete) {
      return;
    }

    setDeletingId(secretToDelete.id);
    try {
      await acpDeleteProviderSecret(secretToDelete.id);
      toast.success(intl.formatMessage(i18n.deleted));
      setSecretToDelete(null);
      await loadSecrets();
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.failedToDelete, {
          error: errorMessage(error, 'Unknown error'),
        })
      );
    } finally {
      setDeletingId(null);
    }
  };

  const configureSecret = async (secret: ProviderSecretDto) => {
    if (!secret.configureProvider) {
      return;
    }

    setConfiguringId(secret.id);
    try {
      await acpAuthenticateProvider(secret.configureProvider);
      toast.success(intl.formatMessage(i18n.signedIn));
      await loadSecrets();
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.failedToConfigure, {
          error: errorMessage(error, 'Unknown error'),
        })
      );
    } finally {
      setConfiguringId(null);
    }
  };

  const isActiveProvider = secretToDelete?.provider === currentProvider;

  const checkGitHubStatus = useCallback(async () => {
    try {
      const secret = await acpReadConfig(GITHUB_TOKEN_CONFIG_KEY, true);
      setGithubStatus(secret == null ? 'disconnected' : 'connected');
    } catch {
      setGithubStatus('disconnected');
      toast.error(intl.formatMessage(i18n.githubStatusFailed));
    }
  }, [intl]);

  useEffect(() => {
    void checkGitHubStatus();
  }, [checkGitHubStatus]);

  const stopGitHubPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    githubFlowRef.current = null;
    setGithubFlow(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  // Best-effort: make the bundled GitHub extension follow the sign-in state.
  const setGitHubExtensionEnabled = async (enabled: boolean) => {
    try {
      const { extensions } = await getConfiguredExtensions();
      const entry = extensions.find((ext) => nameToKey(ext.name) === 'github');
      if (entry && entry.enabled !== enabled) {
        await setConfigExtensionEnabled(entry.configKey ?? nameToKey(entry.name), enabled);
      }
    } catch {
      // The user can still toggle the extension manually in Settings > Extensions.
    }
  };

  const pollGitHubDevice = async (flow: GitHubFlowState) => {
    if (githubFlowRef.current !== flow) {
      return;
    }
    if (Date.now() >= flow.deadlineMs) {
      stopGitHubPolling();
      toast.error(describeGitHubSignInError('expired_token'));
      return;
    }

    let result: GitHubTokenPollResult;
    try {
      result = await window.electron.githubDevicePoll(flow.deviceCode);
    } catch (error) {
      stopGitHubPolling();
      toast.error(
        intl.formatMessage(i18n.githubSignInFailed, {
          error: errorMessage(error, 'network request failed'),
        })
      );
      return;
    }

    if (githubFlowRef.current !== flow) {
      return;
    }

    switch (result.status) {
      case 'ok': {
        stopGitHubPolling();
        try {
          await acpUpsertConfig(GITHUB_TOKEN_CONFIG_KEY, result.accessToken, true);
          setGithubStatus('connected');
          await setGitHubExtensionEnabled(true);
          toast.success(intl.formatMessage(i18n.githubSignedIn));
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
          () => void pollGitHubDevice(flow),
          flow.intervalMs
        );
        return;
      }
      case 'slow_down': {
        flow.intervalMs += GITHUB_SLOW_DOWN_BACKOFF_SECS * 1000;
        pollTimerRef.current = window.setTimeout(
          () => void pollGitHubDevice(flow),
          flow.intervalMs
        );
        return;
      }
      case 'error': {
        stopGitHubPolling();
        toast.error(describeGitHubSignInError(result.error));
        return;
      }
    }
  };

  const startGitHubSignIn = async () => {
    if (!window.electron?.githubDeviceStart || !window.electron?.githubDevicePoll) {
      toast.error(intl.formatMessage(i18n.githubSignInUnavailable));
      return;
    }
    try {
      const device = await window.electron.githubDeviceStart();
      const flow: GitHubFlowState = {
        deviceCode: device.deviceCode,
        userCode: device.userCode,
        verificationUriComplete: device.verificationUriComplete,
        intervalMs: Math.max(device.interval, 1) * 1000,
        deadlineMs: Date.now() + device.expiresIn * 1000,
      };
      githubFlowRef.current = flow;
      setGithubFlow(flow);
      if (flow.verificationUriComplete) {
        void window.electron.openExternal(flow.verificationUriComplete);
      }
      pollTimerRef.current = window.setTimeout(() => void pollGitHubDevice(flow), flow.intervalMs);
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.githubSignInFailed, {
          error: errorMessage(error, 'request failed'),
        })
      );
    }
  };

  const confirmGitHubSignOut = async () => {
    setShowGitHubSignOut(false);
    setSigningOut(true);
    try {
      await acpRemoveConfig(GITHUB_TOKEN_CONFIG_KEY, true);
      setGithubStatus('disconnected');
      await setGitHubExtensionEnabled(false);
      toast.success(intl.formatMessage(i18n.githubSignedOut));
    } catch (error) {
      toast.error(
        intl.formatMessage(i18n.githubSignInFailed, {
          error: errorMessage(error, 'failed to remove credentials'),
        })
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section id="auth" className="space-y-4 pr-4 mt-1">
      <Card className="pb-2">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            {intl.formatMessage(i18n.connectedAccounts)}
          </CardTitle>
          <CardDescription>{intl.formatMessage(i18n.connectedAccountsDescription)}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <div
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
            data-testid="github-account-row"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Github className="h-4 w-4" aria-hidden="true" />
                <h3 className="text-sm font-medium text-text-primary">
                  {intl.formatMessage(i18n.githubAccountName)}
                </h3>
                {githubStatus === 'checking' && (
                  <span className="rounded border border-border-primary bg-background-secondary px-2 py-0.5 text-xs text-text-secondary">
                    {intl.formatMessage(i18n.checkingStatus)}
                  </span>
                )}
                {githubStatus === 'connected' && (
                  <span className="flex items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
                    <CircleCheck className="h-3 w-3" />
                    {intl.formatMessage(i18n.githubConnected)}
                  </span>
                )}
                {githubStatus === 'disconnected' && !githubFlow && (
                  <span className="rounded border border-border-primary bg-background-secondary px-2 py-0.5 text-xs text-text-secondary">
                    {intl.formatMessage(i18n.githubNotConnected)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {intl.formatMessage(i18n.githubAccountDescription)}
              </p>
              {githubFlow && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-text-secondary">
                    {intl.formatMessage(i18n.githubEnterCode, { url: 'github.com/login/device' })}
                  </p>
                  <p className="font-mono text-lg font-semibold tracking-wider text-text-primary">
                    {githubFlow.userCode}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-text-secondary">
                      {intl.formatMessage(i18n.githubWaitingForAuthorization)}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                      onClick={() =>
                        window.open(
                          githubFlow.verificationUriComplete ?? 'https://github.com/login/device',
                          '_blank'
                        )
                      }
                    >
                      {intl.formatMessage(i18n.githubOpenDevicePage)}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {githubFlow ? (
                <Button variant="outline" size="sm" onClick={stopGitHubPolling}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {intl.formatMessage(i18n.cancelSignIn)}
                </Button>
              ) : githubStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
              ) : githubStatus === 'connected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={signingOut}
                  onClick={() => setShowGitHubSignOut(true)}
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {intl.formatMessage(i18n.signOutFromGitHub)}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={startGitHubSignIn}>
                  <Github className="h-4 w-4" />
                  {intl.formatMessage(i18n.signInWithGitHub)}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="pb-2">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {intl.formatMessage(i18n.title)}
          </CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-2">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {intl.formatMessage(i18n.loading)}
            </div>
          ) : secrets.length === 0 ? (
            <div className="py-6 text-sm text-text-secondary">{intl.formatMessage(i18n.empty)}</div>
          ) : (
            <div className="divide-y divide-border-primary">
              {secrets.map((secret) => (
                <div
                  key={secret.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  data-testid="auth-secret-row"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-text-primary">
                        {secret.providerDisplayName}
                      </h3>
                      <span className="rounded border border-border-primary bg-background-secondary px-2 py-0.5 text-xs text-text-secondary">
                        {storageLabel(secret, intl)}
                      </span>
                      {expiryLabel(secret, intl) && (
                        <span
                          className={`rounded border px-2 py-0.5 text-xs ${expiryClass(secret)}`}
                        >
                          {expiryLabel(secret, intl)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-text-secondary">
                      {secret.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {secret.canConfigure && secret.configureProvider && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={configuringId === secret.id}
                        onClick={() => configureSecret(secret)}
                      >
                        {configuringId === secret.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : secret.hasSecret || secret.configured ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        {secret.hasSecret || secret.configured
                          ? intl.formatMessage(i18n.reauthorize)
                          : intl.formatMessage(i18n.signIn)}
                      </Button>
                    )}
                    {secret.canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        shape="round"
                        className="text-text-secondary hover:text-text-primary"
                        disabled={deletingId === secret.id}
                        onClick={() => setSecretToDelete(secret)}
                        aria-label={intl.formatMessage(i18n.deleteCredential)}
                        title={intl.formatMessage(i18n.deleteCredential)}
                      >
                        {deletingId === secret.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={!!secretToDelete}
        title={intl.formatMessage(i18n.deleteTitle)}
        message={
          secretToDelete
            ? intl.formatMessage(i18n.deleteMessage, {
                name: secretToDelete.name,
                provider: secretToDelete.providerDisplayName,
              })
            : ''
        }
        detail={isActiveProvider ? intl.formatMessage(i18n.activeProviderWarning) : undefined}
        onConfirm={confirmDelete}
        onCancel={() => setSecretToDelete(null)}
        confirmLabel={intl.formatMessage(i18n.delete)}
        cancelLabel={intl.formatMessage(i18n.cancel)}
        confirmVariant="destructive"
        isSubmitting={!!deletingId}
      />

      <ConfirmationModal
        isOpen={showGitHubSignOut}
        title={intl.formatMessage(i18n.githubSignOutTitle)}
        message={intl.formatMessage(i18n.githubSignOutMessage)}
        onConfirm={confirmGitHubSignOut}
        onCancel={() => setShowGitHubSignOut(false)}
        confirmLabel={intl.formatMessage(i18n.signOutFromGitHub)}
        cancelLabel={intl.formatMessage(i18n.cancelSignIn)}
        confirmVariant="destructive"
        isSubmitting={signingOut}
      />
    </section>
  );
}
