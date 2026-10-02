import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GitHubView, { buildAskPrompt } from './GitHubView';
import { IntlTestWrapper } from '../../i18n/test-utils';
import * as githubApi from '../../acp/github';
import { startNewSession } from '../../sessions';

vi.mock('../../acp/github', () => ({
  acpGitHubAccount: vi.fn(),
  acpGitHubRepos: vi.fn(),
  acpGitHubIssues: vi.fn(),
  acpGitHubPulls: vi.fn(),
}));

vi.mock('../../sessions', () => ({
  startNewSession: vi.fn(),
}));

vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => vi.fn(),
}));

vi.mock('../ConfigContext', () => ({
  useConfig: () => ({
    getExtensions: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock('../../acp/config', () => ({
  acpReadConfig: vi.fn().mockResolvedValue(null),
  acpUpsertConfig: vi.fn(),
  acpRemoveConfig: vi.fn(),
}));

vi.mock('../../acp/extensions', () => ({
  getConfiguredExtensions: vi.fn().mockResolvedValue({ extensions: [], warnings: [] }),
  setConfigExtensionEnabled: vi.fn(),
  addConfigExtension: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedAccount = vi.mocked(githubApi.acpGitHubAccount);
const mockedRepos = vi.mocked(githubApi.acpGitHubRepos);
const mockedIssues = vi.mocked(githubApi.acpGitHubIssues);
const mockedPulls = vi.mocked(githubApi.acpGitHubPulls);
const mockedStartNewSession = vi.mocked(startNewSession);

const renderWithIntl = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: IntlTestWrapper, ...options });

describe('buildAskPrompt', () => {
  it('names the repository, number, and URL', () => {
    expect(
      buildAskPrompt('pull', 'ArminDashti/Sauron', {
        number: 42,
        title: 'Add GitHub panel',
        htmlUrl: 'https://github.com/ArminDashti/Sauron/pull/42',
      })
    ).toContain('ArminDashti/Sauron#42');
  });
});

describe('GitHubView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    Object.assign(window, {
      electron: {
        githubDeviceStart: vi.fn(),
        githubDevicePoll: vi.fn(),
        openExternal: vi.fn().mockResolvedValue('opened'),
        getGitOriginUrl: vi.fn().mockResolvedValue(null),
      },
      appConfig: {
        get: vi.fn().mockReturnValue(''),
      },
    });
  });

  it('shows the disconnected sign-in state', async () => {
    const { acpReadConfig } = await import('../../acp/config');
    vi.mocked(acpReadConfig).mockResolvedValue(null);

    renderWithIntl(<GitHubView />);

    expect(await screen.findByTestId('github-disconnected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
  });

  it('lists pull requests and starts a chat for Ask Sauron', async () => {
    const user = userEvent.setup();
    const { acpReadConfig } = await import('../../acp/config');
    vi.mocked(acpReadConfig).mockResolvedValue({ maskedValue: 'gho_****' });

    mockedAccount.mockResolvedValue({
      login: 'tester',
      name: 'Test User',
      avatarUrl: 'https://example.com/a.png',
      htmlUrl: 'https://github.com/tester',
    });
    mockedRepos.mockResolvedValue([
      {
        id: 1,
        name: 'Sauron',
        fullName: 'tester/Sauron',
        ownerLogin: 'tester',
        description: 'demo',
        htmlUrl: 'https://github.com/tester/Sauron',
        private: false,
        updatedAt: null,
      },
    ]);
    mockedIssues.mockResolvedValue([]);
    mockedPulls.mockResolvedValue([
      {
        number: 7,
        title: 'Ship GitHub panel',
        htmlUrl: 'https://github.com/tester/Sauron/pull/7',
        state: 'open',
        userLogin: 'tester',
        updatedAt: null,
        draft: false,
      },
    ]);
    mockedStartNewSession.mockResolvedValue({ id: 'session-1' } as never);

    renderWithIntl(<GitHubView />);

    expect(await screen.findByTestId('github-repo-list')).toBeInTheDocument();
    expect(await screen.findByTestId('github-account-avatar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Pull requests/i }));
    expect(await screen.findByText(/#7 Ship GitHub panel/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask Sauron' }));

    await waitFor(() => {
      expect(mockedStartNewSession).toHaveBeenCalled();
    });
    const prompt = mockedStartNewSession.mock.calls[0][0] as string;
    expect(prompt).toContain('tester/Sauron#7');
    expect(prompt).toContain('https://github.com/tester/Sauron/pull/7');
  });
});
