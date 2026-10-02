import { describe, it, expect } from 'vitest';
import { parseGitHubRemoteUrl } from './parseGitHubRemote';

describe('parseGitHubRemoteUrl', () => {
  it('parses HTTPS remotes', () => {
    expect(parseGitHubRemoteUrl('https://github.com/ArminDashti/Sauron.git')).toEqual({
      owner: 'ArminDashti',
      repo: 'Sauron',
    });
  });

  it('parses SSH remotes', () => {
    expect(parseGitHubRemoteUrl('git@github.com:ArminDashti/Sauron.git')).toEqual({
      owner: 'ArminDashti',
      repo: 'Sauron',
    });
  });

  it('returns null for non-GitHub remotes', () => {
    expect(parseGitHubRemoteUrl('https://gitlab.com/org/repo.git')).toBeNull();
    expect(parseGitHubRemoteUrl('')).toBeNull();
  });
});
