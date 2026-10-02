import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleAlert,
  ExternalLink,
  GitPullRequest,
  Github,
  Loader2,
  MessageSquarePlus,
  CircleDot,
} from 'lucide-react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { defineMessages, useIntl } from '../../i18n';
import { useGitHubAccount } from '../../hooks/useGitHubAccount';
import { useConfig } from '../ConfigContext';
import { useNavigation } from '../../hooks/useNavigation';
import { startNewSession } from '../../sessions';
import { getInitialWorkingDir } from '../../utils/workingDir';
import { parseGitHubRemoteUrl } from '../../utils/parseGitHubRemote';
import { errorMessage } from '../../utils/conversionUtils';
import {
  acpGitHubAccount,
  acpGitHubIssues,
  acpGitHubPulls,
  acpGitHubRepos,
  type GitHubAccountDto,
  type GitHubIssueDto,
  type GitHubPullDto,
  type GitHubRepoDto,
} from '../../acp/github';

const i18n = defineMessages({
  title: {
    id: 'githubView.title',
    defaultMessage: 'GitHub',
  },
  description: {
    id: 'githubView.description',
    defaultMessage: 'Browse repositories, issues, and pull requests, then ask Sauron to work on them.',
  },
  notConnectedTitle: {
    id: 'githubView.notConnectedTitle',
    defaultMessage: 'Connect GitHub',
  },
  notConnectedBody: {
    id: 'githubView.notConnectedBody',
    defaultMessage:
      'Sign in with GitHub to list your repositories, issues, and pull requests. Your browser will open to authorize Sauron.',
  },
  signInWithGitHub: {
    id: 'authSettings.signInWithGitHub',
    defaultMessage: 'Sign in with GitHub',
  },
  githubWaitingForAuthorization: {
    id: 'authSettings.githubWaitingForAuthorization',
    defaultMessage: 'Waiting for GitHub authorization...',
  },
  githubEnterCode: {
    id: 'authSettings.githubEnterCode',
    defaultMessage: 'Enter this code at {url} to authorize Sauron:',
  },
  githubOpenAgain: {
    id: 'authSettings.githubOpenAgain',
    defaultMessage: 'Open GitHub again',
  },
  cancelSignIn: {
    id: 'authSettings.cancelSignIn',
    defaultMessage: 'Cancel',
  },
  repositories: {
    id: 'githubView.repositories',
    defaultMessage: 'Repositories',
  },
  issues: {
    id: 'githubView.issues',
    defaultMessage: 'Issues',
  },
  pullRequests: {
    id: 'githubView.pullRequests',
    defaultMessage: 'Pull requests',
  },
  askSauron: {
    id: 'githubView.askSauron',
    defaultMessage: 'Ask Sauron',
  },
  loading: {
    id: 'githubView.loading',
    defaultMessage: 'Loading…',
  },
  emptyRepos: {
    id: 'githubView.emptyRepos',
    defaultMessage: 'No repositories found.',
  },
  emptyIssues: {
    id: 'githubView.emptyIssues',
    defaultMessage: 'No open issues in this repository.',
  },
  emptyPulls: {
    id: 'githubView.emptyPulls',
    defaultMessage: 'No open pull requests in this repository.',
  },
  selectRepo: {
    id: 'githubView.selectRepo',
    defaultMessage: 'Select a repository',
  },
  loadFailed: {
    id: 'githubView.loadFailed',
    defaultMessage: 'Could not load GitHub data: {error}',
  },
  signInAgain: {
    id: 'githubView.signInAgain',
    defaultMessage: 'Sign in again',
  },
  tryAgain: {
    id: 'githubView.tryAgain',
    defaultMessage: 'Try again',
  },
  draft: {
    id: 'githubView.draft',
    defaultMessage: 'Draft',
  },
  private: {
    id: 'githubView.private',
    defaultMessage: 'Private',
  },
});

type ItemTab = 'issues' | 'pulls';

function needsReauth(error: unknown): boolean {
  const message = errorMessage(error, '').toLowerCase();
  return (
    message.includes('sign in') ||
    message.includes('not connected') ||
    message.includes('authorization expired') ||
    message.includes('401')
  );
}

function buildAskPrompt(kind: 'issue' | 'pull', repo: string, item: { number: number; title: string; htmlUrl: string }) {
  const label = kind === 'issue' ? 'issue' : 'pull request';
  return `Help me with GitHub ${label} ${repo}#${item.number}: ${item.title}\n${item.htmlUrl}`;
}

export default function GitHubView() {
  const intl = useIntl();
  const setView = useNavigation();
  const { getExtensions } = useConfig();
  const [account, setAccount] = useState<GitHubAccountDto | null>(null);
  const [repos, setRepos] = useState<GitHubRepoDto[]>([]);
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemTab>('issues');
  const [issues, setIssues] = useState<GitHubIssueDto[]>([]);
  const [pulls, setPulls] = useState<GitHubPullDto[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [askingKey, setAskingKey] = useState<string | null>(null);

  const refreshExtensions = useCallback(async () => {
    await getExtensions(true);
  }, [getExtensions]);

  const {
    status,
    flow,
    startSignIn,
    stopPolling,
    openBrowserAgain,
    checkStatus,
  } = useGitHubAccount({
    onConnected: async () => {
      await refreshExtensions();
      setAuthRequired(false);
    },
  });

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.fullName === selectedFullName) ?? null,
    [repos, selectedFullName]
  );

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setError(null);
    setAuthRequired(false);
    try {
      const [nextAccount, nextRepos] = await Promise.all([
        acpGitHubAccount(),
        acpGitHubRepos({ perPage: 50 }),
      ]);
      setAccount(nextAccount);
      setRepos(nextRepos);

      let preferred: string | null = null;
      const workingDir = getInitialWorkingDir();
      if (workingDir && window.electron?.getGitOriginUrl) {
        const origin = await window.electron.getGitOriginUrl(workingDir);
        const parsed = origin ? parseGitHubRemoteUrl(origin) : null;
        if (parsed) {
          const match = nextRepos.find(
            (repo) =>
              repo.ownerLogin.toLowerCase() === parsed.owner.toLowerCase() &&
              repo.name.toLowerCase() === parsed.repo.toLowerCase()
          );
          if (match) {
            preferred = match.fullName;
          }
        }
      }
      setSelectedFullName((current) => {
        if (current && nextRepos.some((repo) => repo.fullName === current)) {
          return current;
        }
        return preferred ?? nextRepos[0]?.fullName ?? null;
      });
    } catch (err) {
      setAccount(null);
      setRepos([]);
      setSelectedFullName(null);
      setError(errorMessage(err, 'unknown error'));
      setAuthRequired(needsReauth(err));
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const loadItems = useCallback(async (repo: GitHubRepoDto, nextTab: ItemTab) => {
    setLoadingItems(true);
    setError(null);
    try {
      if (nextTab === 'issues') {
        setIssues(await acpGitHubIssues(repo.ownerLogin, repo.name, { perPage: 50 }));
      } else {
        setPulls(await acpGitHubPulls(repo.ownerLogin, repo.name, { perPage: 50 }));
      }
    } catch (err) {
      setIssues([]);
      setPulls([]);
      setError(errorMessage(err, 'unknown error'));
      setAuthRequired(needsReauth(err));
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      void loadRepos();
    }
  }, [status, loadRepos]);

  useEffect(() => {
    if (selectedRepo && status === 'connected') {
      void loadItems(selectedRepo, tab);
    }
  }, [selectedRepo, tab, status, loadItems]);

  const askAbout = async (
    kind: 'issue' | 'pull',
    item: { number: number; title: string; htmlUrl: string }
  ) => {
    if (!selectedRepo) {
      return;
    }
    const key = `${kind}-${item.number}`;
    setAskingKey(key);
    try {
      await startNewSession(
        buildAskPrompt(kind, selectedRepo.fullName, item),
        setView,
        getInitialWorkingDir()
      );
    } finally {
      setAskingKey(null);
    }
  };

  return (
    <MainPanelLayout>
      <div className="flex h-full min-h-0 flex-col px-6 pb-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-text-primary">
              <Github className="h-6 w-6" />
              {intl.formatMessage(i18n.title)}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{intl.formatMessage(i18n.description)}</p>
          </div>
          {account && status === 'connected' && (
            <div className="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2">
              <img
                src={account.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full"
                data-testid="github-account-avatar"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text-primary">{account.login}</div>
                {account.name && (
                  <div className="truncate text-xs text-text-secondary">{account.name}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {status === 'checking' && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {intl.formatMessage(i18n.loading)}
          </div>
        )}

        {(status === 'disconnected' || authRequired) && !flow && (
          <Card className="mx-auto mt-12 max-w-lg p-6 text-center" data-testid="github-disconnected">
            <Github className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <h2 className="text-lg font-medium text-text-primary">
              {intl.formatMessage(i18n.notConnectedTitle)}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {intl.formatMessage(i18n.notConnectedBody)}
            </p>
            {error && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400">
                <CircleAlert className="h-4 w-4" />
                {intl.formatMessage(i18n.loadFailed, { error })}
              </p>
            )}
            <Button className="mt-4 gap-2" onClick={() => void startSignIn()}>
              <Github className="h-4 w-4" />
              {intl.formatMessage(authRequired ? i18n.signInAgain : i18n.signInWithGitHub)}
            </Button>
          </Card>
        )}

        {flow && (
          <Card className="mx-auto mt-12 max-w-lg p-6" data-testid="github-sign-in-flow">
            <p className="text-sm text-text-secondary">
              {intl.formatMessage(i18n.githubEnterCode, { url: 'github.com/login/device' })}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-wider text-text-primary">
              {flow.userCode}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-text-secondary">
                {intl.formatMessage(i18n.githubWaitingForAuthorization)}
              </span>
              <Button variant="outline" size="sm" onClick={() => void openBrowserAgain()}>
                {intl.formatMessage(i18n.githubOpenAgain)}
              </Button>
              <Button variant="ghost" size="sm" onClick={stopPolling}>
                {intl.formatMessage(i18n.cancelSignIn)}
              </Button>
            </div>
          </Card>
        )}

        {status === 'connected' && !authRequired && !flow && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            <Card className="flex min-h-0 flex-col overflow-hidden p-0">
              <div className="border-b border-border-primary px-3 py-2 text-sm font-medium">
                {intl.formatMessage(i18n.repositories)}
              </div>
              <ScrollArea className="min-h-0 flex-1">
                {loadingRepos ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : repos.length === 0 ? (
                  <div className="p-4 text-sm text-text-secondary">
                    {intl.formatMessage(i18n.emptyRepos)}
                  </div>
                ) : (
                  <ul className="p-1" data-testid="github-repo-list">
                    {repos.map((repo) => (
                      <li key={repo.id}>
                        <button
                          type="button"
                          className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            selectedFullName === repo.fullName
                              ? 'bg-background-tertiary text-text-primary'
                              : 'text-text-primary hover:bg-background-tertiary/60'
                          }`}
                          onClick={() => setSelectedFullName(repo.fullName)}
                        >
                          <span className="truncate font-medium">{repo.fullName}</span>
                          <span className="truncate text-xs text-text-secondary">
                            {repo.private
                              ? intl.formatMessage(i18n.private)
                              : repo.description || repo.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border-primary px-3 py-2">
                <div className="flex gap-1">
                  <Button
                    variant={tab === 'issues' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1"
                    onClick={() => setTab('issues')}
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    {intl.formatMessage(i18n.issues)}
                  </Button>
                  <Button
                    variant={tab === 'pulls' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1"
                    onClick={() => setTab('pulls')}
                  >
                    <GitPullRequest className="h-3.5 w-3.5" />
                    {intl.formatMessage(i18n.pullRequests)}
                  </Button>
                </div>
                {selectedRepo && (
                  <a
                    href={selectedRepo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {selectedRepo.fullName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {!selectedRepo ? (
                <div className="p-6 text-sm text-text-secondary">
                  {intl.formatMessage(i18n.selectRepo)}
                </div>
              ) : loadingItems ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : error ? (
                <div className="space-y-3 p-6 text-sm">
                  <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <CircleAlert className="h-4 w-4" />
                    {intl.formatMessage(i18n.loadFailed, { error })}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (authRequired) {
                        void startSignIn();
                      } else {
                        void checkStatus();
                        void loadRepos();
                      }
                    }}
                  >
                    {intl.formatMessage(authRequired ? i18n.signInAgain : i18n.tryAgain)}
                  </Button>
                </div>
              ) : (
                <ScrollArea className="min-h-0 flex-1">
                  {tab === 'issues' ? (
                    issues.length === 0 ? (
                      <div className="p-6 text-sm text-text-secondary">
                        {intl.formatMessage(i18n.emptyIssues)}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border-primary" data-testid="github-issue-list">
                        {issues.map((issue) => (
                          <li
                            key={issue.number}
                            className="flex items-start justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-text-primary">
                                #{issue.number} {issue.title}
                              </div>
                              <div className="mt-1 text-xs text-text-secondary">
                                {issue.userLogin ?? ''}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 shrink-0"
                              disabled={askingKey === `issue-${issue.number}`}
                              onClick={() => void askAbout('issue', issue)}
                            >
                              {askingKey === `issue-${issue.number}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                              )}
                              {intl.formatMessage(i18n.askSauron)}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : pulls.length === 0 ? (
                    <div className="p-6 text-sm text-text-secondary">
                      {intl.formatMessage(i18n.emptyPulls)}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-primary" data-testid="github-pull-list">
                      {pulls.map((pull) => (
                        <li
                          key={pull.number}
                          className="flex items-start justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-text-primary">
                              #{pull.number} {pull.title}
                              {pull.draft && (
                                <span className="ml-2 rounded border border-border-primary px-1.5 py-0.5 text-[10px] uppercase text-text-secondary">
                                  {intl.formatMessage(i18n.draft)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-text-secondary">
                              {pull.userLogin ?? ''}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 shrink-0"
                            disabled={askingKey === `pull-${pull.number}`}
                            onClick={() => void askAbout('pull', pull)}
                          >
                            {askingKey === `pull-${pull.number}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MessageSquarePlus className="h-3.5 w-3.5" />
                            )}
                            {intl.formatMessage(i18n.askSauron)}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              )}
            </Card>
          </div>
        )}
      </div>
    </MainPanelLayout>
  );
}

export { buildAskPrompt };
