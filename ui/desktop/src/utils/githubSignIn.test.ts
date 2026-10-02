import { describe, it, expect } from 'vitest';
import {
  classifyGitHubTokenResponse,
  parseGitHubDeviceCode,
  describeGitHubSignInError,
  githubSignInBrowserUrl,
  GITHUB_DEVICE_URL,
} from './githubSignIn';

describe('classifyGitHubTokenResponse', () => {
  it('returns ok with the access token on success', () => {
    expect(
      classifyGitHubTokenResponse(200, { access_token: 'gho_test', scope: 'repo,gist' })
    ).toEqual({
      status: 'ok',
      accessToken: 'gho_test',
      scope: 'repo,gist',
    });
  });

  it('returns pending for authorization_pending', () => {
    expect(classifyGitHubTokenResponse(200, { error: 'authorization_pending' })).toEqual({
      status: 'pending',
    });
  });

  it('returns slow_down for slow_down', () => {
    expect(classifyGitHubTokenResponse(200, { error: 'slow_down' })).toEqual({
      status: 'slow_down',
    });
  });

  it('maps OAuth errors to error status', () => {
    expect(classifyGitHubTokenResponse(200, { error: 'expired_token' })).toEqual({
      status: 'error',
      error: 'expired_token',
    });
    expect(classifyGitHubTokenResponse(400, { error: 'access_denied' })).toEqual({
      status: 'error',
      error: 'access_denied',
    });
  });

  it('falls back to an unexpected-response error', () => {
    expect(classifyGitHubTokenResponse(500, null)).toEqual({
      status: 'error',
      error: 'unexpected_response_500',
    });
    expect(classifyGitHubTokenResponse(200, {})).toEqual({
      status: 'error',
      error: 'unexpected_response_200',
    });
  });
});

describe('parseGitHubDeviceCode', () => {
  it('parses a successful device code response', () => {
    const parsed = parseGitHubDeviceCode(200, {
      device_code: 'dc-1',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      verification_uri_complete: 'https://github.com/login/device?code=ABCD-1234',
      expires_in: 899,
      interval: 5,
    });
    expect(parsed).toEqual({
      deviceCode: 'dc-1',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      verificationUriComplete: 'https://github.com/login/device?code=ABCD-1234',
      expiresIn: 899,
      interval: 5,
    });
  });

  it('applies fallbacks for optional fields', () => {
    const parsed = parseGitHubDeviceCode(200, {
      device_code: 'dc-2',
      user_code: 'EFGH-5678',
    });
    expect(parsed.verificationUri).toBe(GITHUB_DEVICE_URL);
    expect(parsed.verificationUriComplete).toBeNull();
    expect(parsed.interval).toBeGreaterThan(0);
    expect(parsed.expiresIn).toBeGreaterThan(0);
  });

  it('throws on HTTP errors or missing fields', () => {
    expect(() => parseGitHubDeviceCode(400, { error: 'incorrect_client_id' })).toThrow(
      'incorrect_client_id'
    );
    expect(() => parseGitHubDeviceCode(500, null)).toThrow('device_code_request_failed_500');
    expect(() => parseGitHubDeviceCode(200, { device_code: 'x' })).toThrow();
  });
});

describe('githubSignInBrowserUrl', () => {
  it('prefers verificationUriComplete', () => {
    expect(
      githubSignInBrowserUrl({
        verificationUri: 'https://github.com/login/device',
        verificationUriComplete: 'https://github.com/login/device?user_code=ABCD-1234',
      })
    ).toBe('https://github.com/login/device?user_code=ABCD-1234');
  });

  it('falls back to verificationUri then the default device URL', () => {
    expect(
      githubSignInBrowserUrl({
        verificationUri: 'https://github.com/login/device',
        verificationUriComplete: null,
      })
    ).toBe('https://github.com/login/device');
    expect(
      githubSignInBrowserUrl({
        verificationUri: '',
        verificationUriComplete: null,
      })
    ).toBe(GITHUB_DEVICE_URL);
  });
});

describe('describeGitHubSignInError', () => {
  it('returns a friendly message for known errors', () => {
    expect(describeGitHubSignInError('access_denied')).toContain('denied');
    expect(describeGitHubSignInError('expired_token')).toContain('expired');
  });

  it('includes the raw error for unknown failures', () => {
    expect(describeGitHubSignInError('some_other_error')).toContain('some_other_error');
  });
});
