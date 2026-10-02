import { getAcpClient } from './acpConnection';

export type GitHubAccountDto = {
  login: string;
  name?: string | null;
  avatarUrl: string;
  htmlUrl: string;
};

export type GitHubRepoDto = {
  id: number;
  name: string;
  fullName: string;
  ownerLogin: string;
  description?: string | null;
  htmlUrl: string;
  private: boolean;
  updatedAt?: string | null;
};

export type GitHubIssueDto = {
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  userLogin?: string | null;
  updatedAt?: string | null;
};

export type GitHubPullDto = {
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  userLogin?: string | null;
  updatedAt?: string | null;
  draft: boolean;
};

export type GitHubQuery =
  | { kind: 'account' }
  | { kind: 'repos'; page?: number; perPage?: number }
  | { kind: 'issues'; owner: string; repo: string; page?: number; perPage?: number }
  | { kind: 'pulls'; owner: string; repo: string; page?: number; perPage?: number };

export type GitHubQueryData =
  | { kind: 'account'; account: GitHubAccountDto }
  | { kind: 'repos'; repos: GitHubRepoDto[] }
  | { kind: 'issues'; issues: GitHubIssueDto[] }
  | { kind: 'pulls'; pulls: GitHubPullDto[] };

type AgentRequester = {
  request: (method: string, params: unknown) => Promise<unknown>;
};

function agentRequester(client: Awaited<ReturnType<typeof getAcpClient>>): AgentRequester {
  const sauron = client.sauron as unknown as { conn?: AgentRequester };
  if (sauron.conn?.request) {
    return sauron.conn;
  }
  const connection = client.connection as unknown as { agent?: AgentRequester };
  if (connection.agent?.request) {
    return connection.agent;
  }
  throw new Error('ACP client does not support GitHub queries');
}

export async function acpGitHubQuery(query: GitHubQuery): Promise<GitHubQueryData> {
  const client = await getAcpClient();
  const raw = await agentRequester(client).request('_sauron/unstable/github/query', { query });
  if (!raw || typeof raw !== 'object' || !('data' in raw)) {
    throw new Error('Unexpected GitHub query response');
  }
  return (raw as { data: GitHubQueryData }).data;
}

export async function acpGitHubAccount(): Promise<GitHubAccountDto> {
  const data = await acpGitHubQuery({ kind: 'account' });
  if (data.kind !== 'account') {
    throw new Error('Unexpected GitHub account response');
  }
  return data.account;
}

export async function acpGitHubRepos(options?: {
  page?: number;
  perPage?: number;
}): Promise<GitHubRepoDto[]> {
  const data = await acpGitHubQuery({
    kind: 'repos',
    page: options?.page,
    perPage: options?.perPage,
  });
  if (data.kind !== 'repos') {
    throw new Error('Unexpected GitHub repos response');
  }
  return data.repos;
}

export async function acpGitHubIssues(
  owner: string,
  repo: string,
  options?: { page?: number; perPage?: number }
): Promise<GitHubIssueDto[]> {
  const data = await acpGitHubQuery({
    kind: 'issues',
    owner,
    repo,
    page: options?.page,
    perPage: options?.perPage,
  });
  if (data.kind !== 'issues') {
    throw new Error('Unexpected GitHub issues response');
  }
  return data.issues;
}

export async function acpGitHubPulls(
  owner: string,
  repo: string,
  options?: { page?: number; perPage?: number }
): Promise<GitHubPullDto[]> {
  const data = await acpGitHubQuery({
    kind: 'pulls',
    owner,
    repo,
    page: options?.page,
    perPage: options?.perPage,
  });
  if (data.kind !== 'pulls') {
    throw new Error('Unexpected GitHub pulls response');
  }
  return data.pulls;
}
