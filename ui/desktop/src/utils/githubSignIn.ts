// GitHub OAuth 2.0 device flow (RFC 8628) constants and response handling.
//
// The token produced by this flow is stored under GITHUB_PERSONAL_ACCESS_TOKEN
// so the bundled GitHub extension can authenticate to the remote GitHub MCP
// server with it (Authorization: Bearer <token>).

// Public OAuth client shared with the backend's GitHub Copilot device sign-in
// (crates/goose/src/providers/githubcopilot.rs DEFAULT_GITHUB_COPILOT_CLIENT_ID).
export const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';

// Scopes needed to work with the user's repositories through the GitHub API:
// repositories and issues/PRs (repo), org and team membership (read:org),
// gists (gist), and GitHub Actions (workflow).
export const GITHUB_SIGN_IN_SCOPES = 'repo read:org gist workflow';

export const GITHUB_TOKEN_CONFIG_KEY = 'GITHUB_PERSONAL_ACCESS_TOKEN';

export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
export const GITHUB_DEVICE_URL = 'https://github.com/login/device';

export const GITHUB_DEFAULT_POLL_INTERVAL_SECS = 5;
export const GITHUB_DEFAULT_EXPIRES_IN_SECS = 900;
export const GITHUB_SLOW_DOWN_BACKOFF_SECS = 5;

export type GitHubDeviceCode = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
  expiresIn: number;
  interval: number;
};

export type GitHubTokenPollResult =
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'ok'; accessToken: string; scope?: string }
  | { status: 'error'; error: string };

// GitHub returns OAuth errors with HTTP 200 (or 4xx) plus an `error` field;
// success carries `access_token`.
export function classifyGitHubTokenResponse(status: number, body: unknown): GitHubTokenPollResult {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;

    if (typeof record.access_token === 'string' && record.access_token.length > 0) {
      return {
        status: 'ok',
        accessToken: record.access_token,
        scope: typeof record.scope === 'string' ? record.scope : undefined,
      };
    }

    if (typeof record.error === 'string' && record.error.length > 0) {
      if (record.error === 'authorization_pending') {
        return { status: 'pending' };
      }
      if (record.error === 'slow_down') {
        return { status: 'slow_down' };
      }
      return { status: 'error', error: record.error };
    }
  }

  return { status: 'error', error: `unexpected_response_${status}` };
}

export function parseGitHubDeviceCode(status: number, body: unknown): GitHubDeviceCode {
  if (
    status < 200 ||
    status >= 300 ||
    !body ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>).device_code !== 'string' ||
    typeof (body as Record<string, unknown>).user_code !== 'string'
  ) {
    const record = (body ?? {}) as Record<string, unknown>;
    const error =
      typeof record.error === 'string' ? record.error : `device_code_request_failed_${status}`;
    throw new Error(error);
  }

  const record = body as Record<string, unknown>;
  return {
    deviceCode: record.device_code as string,
    userCode: record.user_code as string,
    verificationUri:
      typeof record.verification_uri === 'string' ? record.verification_uri : GITHUB_DEVICE_URL,
    verificationUriComplete:
      typeof record.verification_uri_complete === 'string'
        ? record.verification_uri_complete
        : null,
    expiresIn:
      typeof record.expires_in === 'number' ? record.expires_in : GITHUB_DEFAULT_EXPIRES_IN_SECS,
    interval:
      typeof record.interval === 'number' ? record.interval : GITHUB_DEFAULT_POLL_INTERVAL_SECS,
  };
}

export function describeGitHubSignInError(error: string): string {
  switch (error) {
    case 'access_denied':
      return 'GitHub sign-in was denied.';
    case 'expired_token':
      return 'The GitHub sign-in code expired. Please try again.';
    case 'incorrect_device_code':
    case 'incorrect_client_id':
      return 'GitHub rejected the sign-in request. Please try again.';
    default:
      return `GitHub sign-in failed (${error}).`;
  }
}
