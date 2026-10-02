import { execFile } from 'child_process';
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

export type GitChangeStatus =
  'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted';

export interface GitChangeFile {
  path: string;
  status: GitChangeStatus;
  staged: boolean;
  unstaged: boolean;
  insertions: number;
  deletions: number;
}

export interface GitChangesResult {
  branch: string | null;
  files: GitChangeFile[];
  insertions: number;
  deletions: number;
}

export interface GitCommitPushResult {
  success: boolean;
  committed: boolean;
  pushed: boolean;
  error?: string;
}

const STATUS_TIMEOUT = 15000;
const DIFF_TIMEOUT = 30000;
const COMMIT_TIMEOUT = 60000;
const PUSH_TIMEOUT = 120000;
/** Guard against gigantic diffs wedging the renderer. */
const MAX_DIFF_CHARS = 1_000_000;

const gitArgs = (dir: string, args: string[]) => [
  '-c',
  'safe.bareRepository=explicit',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.quotepath=false',
  '-C',
  dir,
  ...args,
];

interface GitOutput {
  stdout: string;
  stderr: string;
  code: number;
}

const runGit = (
  dir: string,
  args: string[],
  timeout = 10000,
  allowedCodes: number[] = []
): Promise<GitOutput> =>
  new Promise((resolve, reject) => {
    execFile(
      'git',
      gitArgs(dir, args),
      { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr, code: 0 });
          return;
        }
        const err = error as { code?: unknown; killed?: boolean; message: string };
        if (typeof err.code === 'number' && allowedCodes.includes(err.code)) {
          resolve({ stdout, stderr, code: err.code });
          return;
        }
        if (err.killed) {
          reject(new Error(`git ${args[0]} timed out after ${Math.round(timeout / 1000)}s`));
          return;
        }
        const detail = (stderr || error.message || 'git command failed').toString().trim();
        reject(new Error(detail.slice(0, 500)));
      }
    );
  });

/** Run git but never throw; returns null when git itself cannot run. */
const tryGit = async (
  dir: string,
  args: string[],
  timeout = 10000,
  allowedCodes: number[] = []
): Promise<GitOutput | null> => {
  try {
    return await runGit(dir, args, timeout, allowedCodes);
  } catch {
    return null;
  }
};

interface StatusEntry {
  staged: boolean;
  unstaged: boolean;
  status: GitChangeStatus;
}

const classifyStatus = (x: string, y: string): GitChangeStatus => {
  if (x === '?' || y === '?') return 'untracked';
  if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) {
    return 'conflicted';
  }
  const code = x !== ' ' ? x : y;
  switch (code) {
    case 'A':
      return 'added';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case 'C':
      return 'copied';
    default:
      return 'modified';
  }
};

/**
 * Parse `git status --porcelain=v1 -z` output. Rename/copy entries append the
 * source path as an extra NUL-terminated field, which we skip over.
 */
const parsePorcelain = (raw: string): Map<string, StatusEntry> => {
  const entries = new Map<string, StatusEntry>();
  const fields = raw.split('\0');
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    if (entry.length < 4) continue;
    const x = entry[0];
    const y = entry[1];
    const filePath = entry.slice(3);
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') {
      i++; // skip the source path field of rename/copy entries
    }
    entries.set(filePath, {
      staged: x !== ' ' && x !== '?',
      unstaged: y !== ' ' && y !== '?',
      status: classifyStatus(x, y),
    });
  }
  return entries;
};

/** Parse `git diff --numstat` output into per-path insertion/deletion counts. */
const parseNumstat = (raw: string): Map<string, { insertions: number; deletions: number }> => {
  const stats = new Map<string, { insertions: number; deletions: number }>();
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const firstTab = line.indexOf('\t');
    if (firstTab < 0) continue;
    const secondTab = line.indexOf('\t', firstTab + 1);
    if (secondTab < 0) continue;
    const insertions = parseInt(line.slice(0, firstTab), 10);
    const deletions = parseInt(line.slice(firstTab + 1, secondTab), 10);
    const filePath = line.slice(secondTab + 1);
    stats.set(filePath, {
      insertions: Number.isFinite(insertions) ? insertions : 0,
      deletions: Number.isFinite(deletions) ? deletions : 0,
    });
  }
  return stats;
};

const mergeNumstat = (
  target: Map<string, { insertions: number; deletions: number }>,
  source: Map<string, { insertions: number; deletions: number }>
) => {
  for (const [filePath, counts] of source) {
    const existing = target.get(filePath);
    if (existing) {
      existing.insertions += counts.insertions;
      existing.deletions += counts.deletions;
    } else {
      target.set(filePath, { ...counts });
    }
  }
};

const countUntrackedLines = (dir: string, filePath: string): number => {
  try {
    const absolute = path.resolve(dir, filePath);
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > 2_000_000) return 0;
    const content = fs.readFileSync(absolute, 'utf8');
    if (!content) return 0;
    if (content.includes('\0')) return 0; // binary
    const lines = content.split(/\r?\n/);
    if (lines[lines.length - 1] === '') lines.pop();
    return lines.length;
  } catch {
    return 0;
  }
};

const hasHead = async (dir: string): Promise<boolean> => {
  const out = await tryGit(dir, ['rev-parse', '--verify', 'HEAD'], 5000);
  return out !== null && out.code === 0;
};

const getBranch = async (dir: string): Promise<string | null> => {
  const ref = await tryGit(dir, ['symbolic-ref', '--short', 'HEAD'], 5000);
  if (ref && ref.code === 0) return ref.stdout.trim();
  const sha = await tryGit(dir, ['rev-parse', '--short', 'HEAD'], 5000);
  return sha && sha.code === 0 ? sha.stdout.trim() : null;
};

ipcMain.handle('get-git-changes', async (_event, dir: string): Promise<GitChangesResult | null> => {
  if (!dir?.trim()) return null;

  const status = await tryGit(
    dir,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    STATUS_TIMEOUT
  );
  if (!status || status.code !== 0) return null;

  const entries = parsePorcelain(status.stdout);

  // Combined staged + unstaged counts against HEAD. On repos without any
  // commit yet, fall back to summing the two separate numstat runs.
  const stats = new Map<string, { insertions: number; deletions: number }>();
  if (await hasHead(dir)) {
    const numstat = await tryGit(dir, ['diff', 'HEAD', '--numstat', '--no-color'], DIFF_TIMEOUT);
    if (numstat) mergeNumstat(stats, parseNumstat(numstat.stdout));
  } else {
    const [worktree, staged] = await Promise.all([
      tryGit(dir, ['diff', '--numstat', '--no-color'], DIFF_TIMEOUT),
      tryGit(dir, ['diff', '--cached', '--numstat', '--no-color'], DIFF_TIMEOUT),
    ]);
    if (worktree) mergeNumstat(stats, parseNumstat(worktree.stdout));
    if (staged) mergeNumstat(stats, parseNumstat(staged.stdout));
  }

  const files: GitChangeFile[] = [];
  let insertions = 0;
  let deletions = 0;
  for (const [filePath, entry] of entries) {
    const stat = stats.get(filePath);
    const fileInsertions =
      entry.status === 'untracked' && !stat
        ? countUntrackedLines(dir, filePath)
        : (stat?.insertions ?? 0);
    const fileDeletions = stat?.deletions ?? 0;
    insertions += fileInsertions;
    deletions += fileDeletions;
    files.push({
      path: filePath,
      status: entry.status,
      staged: entry.staged,
      unstaged: entry.unstaged,
      insertions: fileInsertions,
      deletions: fileDeletions,
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  return { branch: await getBranch(dir), files, insertions, deletions };
});

/** Build an all-added unified diff for an untracked file without shelling out. */
const buildUntrackedDiff = (filePath: string, absolutePath: string): string | null => {
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile() || stat.size > 2_000_000) return null;
    const content = fs.readFileSync(absolutePath, 'utf8');
    if (content.includes('\0')) return null; // binary
    let lines = content.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return [
      `diff --git a/${filePath} b/${filePath}`,
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map((line) => `+${line}`),
      '',
    ].join('\n');
  } catch {
    return null;
  }
};

ipcMain.handle('get-git-change-diff', async (_event, dir: string, filePath: string) => {
  if (!dir?.trim() || !filePath?.trim()) return '';

  const status = await tryGit(dir, ['status', '--porcelain=v1', '-z', '--', filePath], 10000);
  const entry = status?.stdout.split('\0')[0] ?? '';

  if (entry.startsWith('??')) {
    const synthetic = buildUntrackedDiff(filePath, path.resolve(dir, filePath));
    if (synthetic !== null) return synthetic;
    return '';
  }

  if (await hasHead(dir)) {
    const diff = await tryGit(
      dir,
      ['diff', '--no-color', '--unified=100', 'HEAD', '--', filePath],
      DIFF_TIMEOUT
    );
    const output = diff?.stdout ?? '';
    return output.length > MAX_DIFF_CHARS ? output.slice(0, MAX_DIFF_CHARS) : output;
  }

  // Unborn HEAD: show staged and unstaged changes separately.
  const [staged, worktree] = await Promise.all([
    tryGit(dir, ['diff', '--cached', '--no-color', '--unified=100', '--', filePath], DIFF_TIMEOUT),
    tryGit(dir, ['diff', '--no-color', '--unified=100', '--', filePath], DIFF_TIMEOUT),
  ]);
  const output = (staged?.stdout ?? '') + (worktree?.stdout ?? '');
  return output.length > MAX_DIFF_CHARS ? output.slice(0, MAX_DIFF_CHARS) : output;
});

ipcMain.handle(
  'commit-and-push-git-changes',
  async (_event, dir: string, message: string): Promise<GitCommitPushResult> => {
    const failed = (error: string, committed = false): GitCommitPushResult => ({
      success: false,
      committed,
      pushed: false,
      error,
    });
    if (!dir?.trim()) return failed('No working directory selected.');
    const commitMessage = String(message ?? '').trim();
    if (!commitMessage) return failed('Commit message is empty.');

    try {
      await runGit(dir, ['add', '-A'], COMMIT_TIMEOUT);
    } catch (error) {
      return failed((error as Error).message);
    }

    const staged = await tryGit(dir, ['diff', '--cached', '--quiet'], 10000, [0, 1]);
    if (staged && staged.code === 0) return failed('Nothing to commit.');

    try {
      await runGit(dir, ['commit', '-m', commitMessage], COMMIT_TIMEOUT);
    } catch (error) {
      return failed((error as Error).message);
    }

    const push = await tryGit(dir, ['push'], PUSH_TIMEOUT);
    if (push && push.code === 0) {
      return { success: true, committed: true, pushed: true };
    }

    // No upstream configured yet: try creating it on first push.
    const branch = await getBranch(dir);
    if (branch) {
      const upstream = await tryGit(
        dir,
        ['push', '--set-upstream', 'origin', branch],
        PUSH_TIMEOUT
      );
      if (upstream && upstream.code === 0) {
        return { success: true, committed: true, pushed: true };
      }
      return failed(upstream?.stderr || push?.stderr || 'Push failed.', true);
    }
    return failed(push?.stderr || 'Push failed.', true);
  }
);
