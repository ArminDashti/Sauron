import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { defineMessages, useIntl } from '../../i18n';
import type { IntlShape } from 'react-intl';
import { cn } from '../../utils';
import { toastError, toastSuccess } from '../../toasts';
import { getInitialWorkingDir } from '../../utils/workingDir';
import { useNavigationSessions } from '../../hooks/useNavigationSessions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DiffViewer } from './DiffViewer';
import type { GitChangeFile, GitChangeStatus, GitChangesResult } from '../../utils/gitChangesIpc';

const i18n = defineMessages({
  title: {
    id: 'changesPanel.title',
    defaultMessage: 'Changes',
  },
  uncommitted: {
    id: 'changesPanel.uncommitted',
    defaultMessage: 'Uncommitted',
  },
  refresh: {
    id: 'changesPanel.refresh',
    defaultMessage: 'Refresh changes',
  },
  close: {
    id: 'changesPanel.close',
    defaultMessage: 'Close changes panel',
  },
  noChanges: {
    id: 'changesPanel.noChanges',
    defaultMessage: 'No changes',
  },
  cleanTree: {
    id: 'changesPanel.cleanTree',
    defaultMessage: 'Working tree clean',
  },
  noDirectory: {
    id: 'changesPanel.noDirectory',
    defaultMessage: 'No working directory selected',
  },
  notARepo: {
    id: 'changesPanel.notARepo',
    defaultMessage: 'Not a git repository',
  },
  loadFailed: {
    id: 'changesPanel.loadFailed',
    defaultMessage: 'Could not load git changes',
  },
  retry: {
    id: 'changesPanel.retry',
    defaultMessage: 'Retry',
  },
  loading: {
    id: 'changesPanel.loading',
    defaultMessage: 'Loading changes…',
  },
  loadingDiff: {
    id: 'changesPanel.loadingDiff',
    defaultMessage: 'Loading diff…',
  },
  commitPlaceholder: {
    id: 'changesPanel.commitPlaceholder',
    defaultMessage: 'Commit message',
  },
  commitAndPush: {
    id: 'changesPanel.commitAndPush',
    defaultMessage: 'Commit & Push',
  },
  committing: {
    id: 'changesPanel.committing',
    defaultMessage: 'Committing…',
  },
  commitSuccess: {
    id: 'changesPanel.commitSuccess',
    defaultMessage: 'Committed and pushed',
  },
  commitFailed: {
    id: 'changesPanel.commitFailed',
    defaultMessage: 'Commit failed',
  },
  pushFailed: {
    id: 'changesPanel.pushFailed',
    defaultMessage: 'Committed, but push failed',
  },
  statusAdded: {
    id: 'changesPanel.statusAdded',
    defaultMessage: 'Added',
  },
  statusModified: {
    id: 'changesPanel.statusModified',
    defaultMessage: 'Modified',
  },
  statusDeleted: {
    id: 'changesPanel.statusDeleted',
    defaultMessage: 'Deleted',
  },
  statusRenamed: {
    id: 'changesPanel.statusRenamed',
    defaultMessage: 'Renamed',
  },
  statusCopied: {
    id: 'changesPanel.statusCopied',
    defaultMessage: 'Copied',
  },
  statusUntracked: {
    id: 'changesPanel.statusUntracked',
    defaultMessage: 'Untracked',
  },
  statusConflicted: {
    id: 'changesPanel.statusConflicted',
    defaultMessage: 'Conflicted',
  },
});

const STATUS_APPEARANCE: Record<
  GitChangeStatus,
  { letter: string; className: string; labelKey: keyof typeof i18n }
> = {
  added: { letter: 'A', className: 'text-green-600 dark:text-green-400', labelKey: 'statusAdded' },
  modified: {
    letter: 'M',
    className: 'text-yellow-600 dark:text-yellow-400',
    labelKey: 'statusModified',
  },
  deleted: { letter: 'D', className: 'text-red-600 dark:text-red-400', labelKey: 'statusDeleted' },
  renamed: {
    letter: 'R',
    className: 'text-purple-600 dark:text-purple-400',
    labelKey: 'statusRenamed',
  },
  copied: {
    letter: 'C',
    className: 'text-purple-600 dark:text-purple-400',
    labelKey: 'statusCopied',
  },
  untracked: {
    letter: '?',
    className: 'text-blue-600 dark:text-blue-400',
    labelKey: 'statusUntracked',
  },
  conflicted: {
    letter: '!',
    className: 'text-red-600 dark:text-red-400',
    labelKey: 'statusConflicted',
  },
};

const statusLabel = (status: GitChangeStatus, intl: IntlShape): string =>
  intl.formatMessage(i18n[STATUS_APPEARANCE[status].labelKey]);

const POLL_INTERVAL_MS = 15000;

interface ChangesPanelProps {
  onClose: () => void;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({ onClose }) => {
  const intl = useIntl();
  const { activeSessionId, recentSessions } = useNavigationSessions();

  const dir = useMemo(() => {
    const active = recentSessions.find((session) => session.id === activeSessionId);
    return active?.workingDir || getInitialWorkingDir();
  }, [recentSessions, activeSessionId]);

  const [data, setData] = useState<GitChangesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notARepo, setNotARepo] = useState(false);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ path: string; content: string } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);

  const fetchIdRef = useRef(0);
  const diffFetchIdRef = useRef(0);
  const expandedPathRef = useRef<string | null>(null);
  expandedPathRef.current = expandedPath;

  const loadDiff = useCallback(
    async (filePath: string) => {
      const fetchId = ++diffFetchIdRef.current;
      setDiffLoading(true);
      try {
        const content = await window.electron.getGitChangeDiff(dir, filePath);
        if (fetchId === diffFetchIdRef.current) setDiff({ path: filePath, content });
      } catch {
        if (fetchId === diffFetchIdRef.current) setDiff({ path: filePath, content: '' });
      } finally {
        if (fetchId === diffFetchIdRef.current) setDiffLoading(false);
      }
    },
    [dir]
  );

  const refresh = useCallback(async () => {
    if (!dir) {
      setData(null);
      setLoadError(false);
      setNotARepo(false);
      return;
    }
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const result = await window.electron.getGitChanges(dir);
      if (fetchId !== fetchIdRef.current) return;
      setData(result);
      setNotARepo(result === null);
      setLoadError(false);
      // Keep the open diff fresh while its file still has changes.
      const openPath = expandedPathRef.current;
      if (openPath && result?.files.some((file) => file.path === openPath)) {
        void loadDiff(openPath);
      } else if (openPath) {
        setExpandedPath(null);
        setDiff(null);
      }
    } catch {
      if (fetchId === fetchIdRef.current) setLoadError(true);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [dir, loadDiff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [refresh]);

  const handleToggleFile = (filePath: string) => {
    if (expandedPath === filePath) {
      diffFetchIdRef.current++;
      setExpandedPath(null);
      setDiff(null);
      setDiffLoading(false);
      return;
    }
    setExpandedPath(filePath);
    setDiff(null);
    void loadDiff(filePath);
  };

  const handleCommit = async () => {
    const message = commitMessage.trim();
    if (!message || committing || !dir || !data?.files.length) return;
    setCommitting(true);
    try {
      const result = await window.electron.commitAndPushGitChanges(dir, message);
      if (result.success) {
        toastSuccess({ title: intl.formatMessage(i18n.commitSuccess) });
        setCommitMessage('');
        await refresh();
      } else if (result.committed) {
        toastError({
          title: intl.formatMessage(i18n.pushFailed),
          msg: result.error ?? '',
        });
        await refresh();
      } else {
        toastError({ title: intl.formatMessage(i18n.commitFailed), msg: result.error ?? '' });
      }
    } catch (error) {
      toastError({
        title: intl.formatMessage(i18n.commitFailed),
        msg: (error as Error).message,
      });
    } finally {
      setCommitting(false);
    }
  };

  const renderBody = () => {
    if (!dir) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertCircle className="h-5 w-5 text-text-tertiary" />
          <p className="text-xs text-text-tertiary">{intl.formatMessage(i18n.noDirectory)}</p>
        </div>
      );
    }
    if (loadError && !data) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-xs text-text-secondary">{intl.formatMessage(i18n.loadFailed)}</p>
          <Button variant="outline" size="xs" onClick={() => void refresh()}>
            {intl.formatMessage(i18n.retry)}
          </Button>
        </div>
      );
    }
    if (notARepo && !data) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertCircle className="h-5 w-5 text-text-tertiary" />
          <p className="text-xs text-text-secondary">{intl.formatMessage(i18n.notARepo)}</p>
        </div>
      );
    }
    if (!data) {
      return (
        <div className="flex h-full items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
          <span className="text-xs text-text-tertiary">{intl.formatMessage(i18n.loading)}</span>
        </div>
      );
    }
    if (!data.files.length) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <p className="text-xs font-medium text-text-secondary">
            {intl.formatMessage(i18n.noChanges)}
          </p>
          <p className="text-[11px] text-text-tertiary">{intl.formatMessage(i18n.cleanTree)}</p>
        </div>
      );
    }
    return (
      <ul className="divide-y divide-border-primary/50">
        {data.files.map((file) => (
          <FileRow
            key={file.path}
            file={file}
            expanded={expandedPath === file.path}
            diff={diff?.path === file.path ? diff.content : null}
            diffLoading={diffLoading && expandedPath === file.path}
            onToggle={() => handleToggleFile(file.path)}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background-primary text-text-primary">
      <div className="flex items-center gap-2 border-b border-border-primary px-3 py-2">
        <GitCompareArrows className="h-4 w-4 flex-shrink-0 text-text-secondary" />
        <span className="text-sm font-semibold">{intl.formatMessage(i18n.title)}</span>
        {data && data.files.length > 0 && (
          <span className="rounded-full bg-background-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            {data.files.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {data && (
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-green-600 dark:text-green-400">+{data.insertions}</span>
              <span className="text-red-600 dark:text-red-400">-{data.deletions}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            title={intl.formatMessage(i18n.refresh)}
            aria-label={intl.formatMessage(i18n.refresh)}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title={intl.formatMessage(i18n.close)}
            aria-label={intl.formatMessage(i18n.close)}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-border-primary px-3 py-1.5 text-xs text-text-secondary">
        <span>{intl.formatMessage(i18n.uncommitted)}</span>
        {data?.branch && (
          <span
            className="ml-auto flex min-w-0 items-center gap-1 font-mono text-[11px] text-text-tertiary"
            title={data.branch}
          >
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{data.branch}</span>
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{renderBody()}</div>

      {data && data.files.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border-primary p-2">
          <Input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCommit();
              event.stopPropagation();
            }}
            placeholder={intl.formatMessage(i18n.commitPlaceholder)}
            aria-label={intl.formatMessage(i18n.commitPlaceholder)}
            className="h-8 flex-1 text-xs"
          />
          <Button
            size="xs"
            onClick={() => void handleCommit()}
            disabled={committing || !commitMessage.trim()}
            className="h-8"
          >
            {committing && <Loader2 className="h-3 w-3 animate-spin" />}
            {committing
              ? intl.formatMessage(i18n.committing)
              : intl.formatMessage(i18n.commitAndPush)}
          </Button>
        </div>
      )}
    </div>
  );
};

interface FileRowProps {
  file: GitChangeFile;
  expanded: boolean;
  diff: string | null;
  diffLoading: boolean;
  onToggle: () => void;
}

const FileRow: React.FC<FileRowProps> = ({ file, expanded, diff, diffLoading, onToggle }) => {
  const intl = useIntl();
  const appearance = STATUS_APPEARANCE[file.status];
  const label = statusLabel(file.status, intl);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        title={`${file.path} — ${label}`}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-background-tertiary/60"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
        )}
        <span
          className={cn(
            'w-4 flex-shrink-0 text-center font-mono text-[10px] font-bold',
            appearance.className
          )}
          aria-label={label}
        >
          {appearance.letter}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
          {file.path}
        </span>
        {file.insertions > 0 && (
          <span className="flex-shrink-0 font-mono text-[10px] text-green-600 dark:text-green-400">
            +{file.insertions}
          </span>
        )}
        {file.deletions > 0 && (
          <span className="flex-shrink-0 font-mono text-[10px] text-red-600 dark:text-red-400">
            -{file.deletions}
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-y border-border-primary bg-background-secondary/40">
          {diffLoading && diff === null ? (
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-text-tertiary">
              <Loader2 className="h-3 w-3 animate-spin" />
              {intl.formatMessage(i18n.loadingDiff)}
            </div>
          ) : (
            <DiffViewer diff={diff ?? ''} />
          )}
        </div>
      )}
    </li>
  );
};

export default ChangesPanel;
