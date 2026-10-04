import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  ClipboardCopy,
  Folder,
  FolderOpen,
  GitFork,
  ListFilter,
  MailQuestion,
  MessageSquarePlus,
  Pencil,
  Pin,
  PinOff,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigationContext } from './NavigationContext';
import { useNavigationSessions } from '../../hooks/useNavigationSessions';
import {
  NAV_ITEMS,
  SETTINGS_NAV_ITEM,
  getNavItemLabel,
  type NavItem,
} from '../../hooks/useNavigationItems';
import { AppEvents } from '../../constants/events';
import { InlineEditText, type InlineEditTextHandle } from '../common/InlineEditText';
import { Button } from '../ui/button';
import NavigationFooter from './NavigationFooter';
import { SessionIndicators } from '../SessionIndicators';
import {
  acpDeleteSession,
  acpExportSession,
  acpForkSession,
  acpRenameSession,
  type SessionListItem,
} from '../../acp/sessions';
import { acpChatSessionActions } from '../../acp/chatSessionStore';
import { cancelAcpPermissionRequestsForSession } from '../../acp/permissionRequests';
import { cancelAcpElicitationRequestsForSession } from '../../acp/elicitationRequests';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  useContextMenu,
} from '../ui/context-menu';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { usePinnedSessions } from '../../hooks/usePinnedSessions';
import { useNavigation } from '../../hooks/useNavigation';
import { startNewSession } from '../../sessions';
import { formatMessageTimestamp, formatRelativeTimestamp } from '../../utils/timeUtils';
import { errorMessage } from '../../utils/conversionUtils';
import { cn } from '../../utils';
import { groupSessionsByProject, type ProjectGroup } from '../../utils/projectSessions';
import { defineMessages, useIntl } from '../../i18n';
import { toast } from 'react-toastify';

type StreamState = 'idle' | 'loading' | 'streaming' | 'error';

interface SessionStatus {
  streamState: StreamState;
  hasUnreadActivity: boolean;
}

const i18n = defineMessages({
  projects: {
    id: 'navigationPanel.projects',
    defaultMessage: 'Projects',
  },
  chats: {
    id: 'navigationPanel.chats',
    defaultMessage: 'Chats',
  },
  newChat: {
    id: 'navigationPanel.newChat',
    defaultMessage: 'New chat',
  },
  toastNewChatFailed: {
    id: 'navigationPanel.toast.newChatFailed',
    defaultMessage: 'Could not start chat: {error}',
  },
  workspaces: {
    id: 'navigationPanel.workspaces',
    defaultMessage: 'Workspaces',
  },
  newProject: {
    id: 'navigationPanel.newProject',
    defaultMessage: 'New Project',
  },
  goBack: {
    id: 'navigationPanel.goBack',
    defaultMessage: 'Back',
  },
  goForward: {
    id: 'navigationPanel.goForward',
    defaultMessage: 'Forward',
  },
  groupChats: {
    id: 'navigationPanel.groupChats',
    defaultMessage: 'Group chats by workspace',
  },
  noChats: {
    id: 'navigationPanel.noChats',
    defaultMessage: 'No recent chats',
  },
  loadingChats: {
    id: 'navigationPanel.loadingChats',
    defaultMessage: 'Loading chats…',
  },
  untitledSession: {
    id: 'navigationPanel.untitledSession',
    defaultMessage: 'Untitled session',
  },
  metaModel: {
    id: 'navigationPanel.metaModel',
    defaultMessage: 'Model',
  },
  metaDirectory: {
    id: 'navigationPanel.metaDirectory',
    defaultMessage: 'Directory',
  },
  metaStatus: {
    id: 'navigationPanel.metaStatus',
    defaultMessage: 'Status',
  },
  metaCreated: {
    id: 'navigationPanel.metaCreated',
    defaultMessage: 'Created',
  },
  metaUpdated: {
    id: 'navigationPanel.metaUpdated',
    defaultMessage: 'Updated',
  },
  statusStreaming: {
    id: 'navigationPanel.statusStreaming',
    defaultMessage: 'Streaming',
  },
  statusError: {
    id: 'navigationPanel.statusError',
    defaultMessage: 'Error',
  },
  statusUnread: {
    id: 'navigationPanel.statusUnread',
    defaultMessage: 'Unread activity',
  },
  statusIdle: {
    id: 'navigationPanel.statusIdle',
    defaultMessage: 'Idle',
  },
  returnToActiveLiveVoice: {
    id: 'liveVoice.returnToActive',
    defaultMessage: 'Return to active Live voice',
  },
  pinned: {
    id: 'navigationPanel.pinned',
    defaultMessage: 'Pinned',
  },
  actionPin: {
    id: 'navigationPanel.action.pin',
    defaultMessage: 'Pin',
  },
  actionUnpin: {
    id: 'navigationPanel.action.unpin',
    defaultMessage: 'Unpin',
  },
  actionRename: {
    id: 'navigationPanel.action.rename',
    defaultMessage: 'Rename',
  },
  actionMarkUnread: {
    id: 'navigationPanel.action.markUnread',
    defaultMessage: 'Mark as Unread',
  },
  actionFork: {
    id: 'navigationPanel.action.fork',
    defaultMessage: 'Fork',
  },
  actionCopyTranscript: {
    id: 'navigationPanel.action.copyTranscript',
    defaultMessage: 'Copy Transcript',
  },
  actionDelete: {
    id: 'navigationPanel.action.delete',
    defaultMessage: 'Delete',
  },
  cancel: {
    id: 'navigationPanel.cancel',
    defaultMessage: 'Cancel',
  },
  deleteDialogTitle: {
    id: 'navigationPanel.delete.title',
    defaultMessage: 'Delete Chat',
  },
  deleteDialogMessage: {
    id: 'navigationPanel.delete.message',
    defaultMessage: 'Delete "{name}"? This cannot be undone.',
  },
  toastForked: {
    id: 'navigationPanel.toast.forked',
    defaultMessage: 'Forked into a new chat',
  },
  toastForkFailed: {
    id: 'navigationPanel.toast.forkFailed',
    defaultMessage: 'Could not fork chat: {error}',
  },
  toastTranscriptCopied: {
    id: 'navigationPanel.toast.transcriptCopied',
    defaultMessage: 'Transcript copied to clipboard',
  },
  toastTranscriptCopyFailed: {
    id: 'navigationPanel.toast.transcriptCopyFailed',
    defaultMessage: 'Could not copy transcript: {error}',
  },
  toastDeleteFailed: {
    id: 'navigationPanel.toast.deleteFailed',
    defaultMessage: 'Could not delete chat: {error}',
  },
});

const navItemClass = (active: boolean) =>
  cn(
    'flex flex-row items-center gap-2.5 outline-none no-drag w-full',
    'h-8 px-2 rounded-[10px] text-sm font-medium transition-colors',
    active
      ? 'bg-background-tertiary text-text-primary'
      : 'text-text-primary hover:bg-background-tertiary/60'
  );

interface NavRowProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

const NavRow: React.FC<NavRowProps> = ({ item, active, onClick }) => {
  const intl = useIntl();
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={navItemClass(active)}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-left flex-1 truncate">{getNavItemLabel(item, intl)}</span>
      {item.getTag && (
        <span className="text-xs font-mono text-text-secondary">{item.getTag()}</span>
      )}
    </button>
  );
};

interface SessionRowProps {
  session: SessionListItem;
  active: boolean;
  isLiveVoiceActive: boolean;
  status: SessionStatus | undefined;
  isPinned: boolean;
  onClick: () => void;
  onRenamed: () => void;
  onTogglePin: (session: SessionListItem) => void;
  onMarkUnread: (sessionId: string) => void;
  onFork: (session: SessionListItem) => void;
  onCopyTranscript: (session: SessionListItem) => void;
  onDelete: (session: SessionListItem) => void;
}

const formatTimestamp = (value?: string): string | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return formatMessageTimestamp(parsed / 1000);
};

const relativeTimestamp = (value?: string): string | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return formatRelativeTimestamp(parsed / 1000) || null;
};

const MetaRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-text-inverse/60 flex-shrink-0">{label}</span>
    <span className="text-right ml-auto break-all">{value}</span>
  </div>
);

interface SessionTooltipContentProps {
  session: SessionListItem;
  statusLabel: string;
}

const SessionTooltipContent: React.FC<SessionTooltipContentProps> = ({ session, statusLabel }) => {
  const intl = useIntl();
  const model = session.modelId
    ? session.providerId
      ? `${session.modelId} (${session.providerId})`
      : session.modelId
    : session.providerId;
  const created = formatTimestamp(session.createdAt);
  const updated = formatTimestamp(session.lastMessageAt ?? session.updatedAt);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="font-medium break-words">
        {session.name || intl.formatMessage(i18n.untitledSession)}
      </div>
      <div className="flex flex-col gap-0.5">
        {model && <MetaRow label={intl.formatMessage(i18n.metaModel)} value={model} />}
        {session.workingDir && (
          <MetaRow label={intl.formatMessage(i18n.metaDirectory)} value={session.workingDir} />
        )}
        <MetaRow label={intl.formatMessage(i18n.metaStatus)} value={statusLabel} />
        {created && <MetaRow label={intl.formatMessage(i18n.metaCreated)} value={created} />}
        {updated && <MetaRow label={intl.formatMessage(i18n.metaUpdated)} value={updated} />}
      </div>
    </div>
  );
};

interface SessionContextMenuProps {
  isStreaming: boolean;
  hasUnread: boolean;
  isPinned: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onMarkUnread: () => void;
  onFork: () => void;
  onCopyTranscript: () => void;
  onDelete: () => void;
}

const SessionContextMenu: React.FC<SessionContextMenuProps> = ({
  isStreaming,
  hasUnread,
  isPinned,
  onRename,
  onTogglePin,
  onMarkUnread,
  onFork,
  onCopyTranscript,
  onDelete,
}) => {
  const intl = useIntl();
  const { close } = useContextMenu();

  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={run(onTogglePin)}>
        {isPinned ? <PinOff /> : <Pin />}
        {intl.formatMessage(isPinned ? i18n.actionUnpin : i18n.actionPin)}
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(onRename)} disabled={isStreaming}>
        <Pencil />
        {intl.formatMessage(i18n.actionRename)}
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(onMarkUnread)} disabled={hasUnread}>
        <MailQuestion />
        {intl.formatMessage(i18n.actionMarkUnread)}
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(onFork)}>
        <GitFork />
        {intl.formatMessage(i18n.actionFork)}
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(onCopyTranscript)}>
        <ClipboardCopy />
        {intl.formatMessage(i18n.actionCopyTranscript)}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={run(onDelete)}>
        <Trash2 />
        {intl.formatMessage(i18n.actionDelete)}
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

const SessionRow: React.FC<SessionRowProps> = (props) => (
  <ContextMenu>
    <SessionRowBody {...props} />
  </ContextMenu>
);

// Split from SessionRow so it renders below the ContextMenu provider that owns
// the open/close state its trigger and menu both read.
const SessionRowBody: React.FC<SessionRowProps> = ({
  session,
  active,
  isLiveVoiceActive,
  status,
  isPinned,
  onClick,
  onRenamed,
  onTogglePin,
  onMarkUnread,
  onFork,
  onCopyTranscript,
  onDelete,
}) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const editRef = useRef<InlineEditTextHandle>(null);
  const contextMenu = useContextMenu();
  const isStreaming = status?.streamState === 'streaming';
  const hasError = status?.streamState === 'error';
  const hasUnread = status?.hasUnreadActivity ?? false;

  const statusLabel = isStreaming
    ? intl.formatMessage(i18n.statusStreaming)
    : hasError
      ? intl.formatMessage(i18n.statusError)
      : hasUnread
        ? intl.formatMessage(i18n.statusUnread)
        : intl.formatMessage(i18n.statusIdle);

  const isEmptySession = (session.messageCount ?? 0) === 0;
  const updatedLabel = relativeTimestamp(session.lastMessageAt ?? session.updatedAt);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // A right-click is never a rename gesture, and the tooltip would sit under
      // the menu it is describing.
      setTooltipOpen(false);
      contextMenu.open(event);
    },
    [contextMenu]
  );

  const handleRename = useCallback(() => {
    contextMenu.close();
    editRef.current?.startEdit();
  }, [contextMenu]);

  return (
    <>
      <Tooltip open={tooltipOpen && !isEditing} onOpenChange={setTooltipOpen} delayDuration={400}>
        <TooltipTrigger asChild>
          <div
            onClick={() => !isEditing && onClick()}
            onContextMenu={isEditing ? undefined : handleContextMenu}
            style={{ WebkitTouchCallout: 'none' }}
            className={cn(
              'flex items-center gap-2 h-8 px-2 rounded-[10px] cursor-pointer text-sm',
              'hover:bg-background-tertiary/60 transition-colors',
              active && 'bg-background-tertiary'
            )}
          >
            <span
              aria-hidden="true"
              className="flex w-3.5 flex-shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  'block h-[7px] w-[7px] rounded-full',
                  isEmptySession ? 'border border-text-tertiary' : 'bg-text-tertiary'
                )}
              />
            </span>
            <InlineEditText
              ref={editRef}
              value={session.name}
              onSave={async (newName) => {
                await acpRenameSession(session.id, newName);
                window.dispatchEvent(
                  new CustomEvent(AppEvents.SESSION_RENAMED, {
                    detail: { sessionId: session.id, newName, userInitiated: true },
                  })
                );
                onRenamed();
              }}
              placeholder={intl.formatMessage(i18n.untitledSession)}
              disabled={isStreaming}
              singleClickEdit={false}
              className={cn(
                'truncate flex-1 !px-0 !py-0 hover:bg-transparent',
                isEmptySession
                  ? 'text-text-secondary'
                  : active
                    ? 'text-text-primary'
                    : 'text-text-primary/80'
              )}
              editClassName="!text-sm"
              onEditStart={() => setIsEditing(true)}
              onEditEnd={() => setIsEditing(false)}
            />
            {isLiveVoiceActive && (
              <AudioLines
                className="w-3.5 h-3.5 flex-shrink-0 text-blue-500"
                aria-label={intl.formatMessage(i18n.returnToActiveLiveVoice)}
              />
            )}
            <SessionIndicators
              isStreaming={isStreaming}
              hasUnread={hasUnread}
              hasError={hasError}
            />
            {updatedLabel && (
              <span className="flex-shrink-0 text-text-secondary tabular-nums">{updatedLabel}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-xs text-left">
          <SessionTooltipContent session={session} statusLabel={statusLabel} />
        </TooltipContent>
      </Tooltip>

      <SessionContextMenu
        isStreaming={isStreaming}
        hasUnread={hasUnread}
        isPinned={isPinned}
        onRename={handleRename}
        onTogglePin={() => onTogglePin(session)}
        onMarkUnread={() => onMarkUnread(session.id)}
        onFork={() => onFork(session)}
        onCopyTranscript={() => onCopyTranscript(session)}
        onDelete={() => onDelete(session)}
      />
    </>
  );
};

interface SectionHeaderProps {
  label: string;
  actions?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, actions }) => (
  <div className="flex h-8 items-center justify-between">
    <span className="pl-2.5 text-xs font-semibold text-text-secondary">{label}</span>
    {actions}
  </div>
);

export const Navigation: React.FC<{
  className?: string;
  activeLiveVoiceSessionId: string | null;
}> = ({ className, activeLiveVoiceSessionId }) => {
  const intl = useIntl();
  const { isNavExpanded } = useNavigationContext();
  const location = useLocation();
  const navigate = useNavigate();
  const setView = useNavigation();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const {
    recentSessions,
    isLoadingSessions,
    activeSessionId,
    fetchSessions,
    handleNavClick,
    handleSessionClick,
  } = useNavigationSessions();

  const { isPinned, togglePin, forgetSessions } = usePinnedSessions();

  const [sessionStatuses, setSessionStatuses] = useState<Map<string, SessionStatus>>(new Map());

  useEffect(() => {
    const handleStatusUpdate = (event: Event) => {
      const { sessionId, streamState } = (event as CustomEvent).detail;
      setSessionStatuses((prev) => {
        const existing = prev.get(sessionId);
        const shouldMarkUnread = existing?.streamState === 'streaming' && streamState === 'idle';
        const next = new Map(prev);
        next.set(sessionId, {
          streamState,
          hasUnreadActivity: existing?.hasUnreadActivity || shouldMarkUnread,
        });
        return next;
      });
    };

    window.addEventListener(AppEvents.SESSION_STATUS_UPDATE, handleStatusUpdate);
    return () => window.removeEventListener(AppEvents.SESSION_STATUS_UPDATE, handleStatusUpdate);
  }, []);

  const clearUnread = useCallback((sessionId: string) => {
    setSessionStatuses((prev) => {
      const status = prev.get(sessionId);
      if (status?.hasUnreadActivity) {
        const next = new Map(prev);
        next.set(sessionId, { ...status, hasUnreadActivity: false });
        return next;
      }
      return prev;
    });
  }, []);

  const [sessionToDelete, setSessionToDelete] = useState<SessionListItem | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChat = useCallback(async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    try {
      await startNewSession(undefined, setView, '', { chatOnly: true });
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error(
        intl.formatMessage(i18n.toastNewChatFailed, {
          error: errorMessage(error, 'Unknown error'),
        })
      );
    } finally {
      setIsStartingChat(false);
    }
  }, [isStartingChat, intl, setView]);

  const handleTogglePin = useCallback(
    (session: SessionListItem) => togglePin(session.id),
    [togglePin]
  );

  const handleMarkUnread = useCallback((sessionId: string) => {
    setSessionStatuses((prev) => {
      const status = prev.get(sessionId) ?? {
        streamState: 'idle' as StreamState,
        hasUnreadActivity: false,
      };
      if (status.hasUnreadActivity) return prev;
      const next = new Map(prev);
      next.set(sessionId, { ...status, hasUnreadActivity: true });
      return next;
    });
  }, []);

  const handleFork = useCallback(
    async (session: SessionListItem) => {
      try {
        await acpForkSession(session.id);
        toast.success(intl.formatMessage(i18n.toastForked));
        window.dispatchEvent(new CustomEvent(AppEvents.SESSION_CREATED));
        await fetchSessions();
      } catch (error) {
        console.error('Failed to fork session:', error);
        toast.error(
          intl.formatMessage(i18n.toastForkFailed, { error: errorMessage(error, 'Unknown error') })
        );
      }
    },
    [fetchSessions, intl]
  );

  const handleCopyTranscript = useCallback(
    async (session: SessionListItem) => {
      try {
        const markdown = await acpExportSession(session.id, 'markdown');
        await navigator.clipboard.writeText(markdown);
        toast.success(intl.formatMessage(i18n.toastTranscriptCopied));
      } catch (error) {
        console.error('Failed to copy session transcript:', error);
        toast.error(
          intl.formatMessage(i18n.toastTranscriptCopyFailed, {
            error: errorMessage(error, 'Unknown error'),
          })
        );
      }
    },
    [intl]
  );

  const handleDelete = useCallback((session: SessionListItem) => {
    setSessionToDelete(session);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!sessionToDelete) return;
    const { id: sessionId } = sessionToDelete;
    setSessionToDelete(null);

    try {
      await acpDeleteSession(sessionId);
      forgetSessions([sessionId]);
      setSessionStatuses((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
      window.dispatchEvent(new CustomEvent(AppEvents.SESSION_DELETED, { detail: { sessionId } }));
      cancelAcpPermissionRequestsForSession(sessionId);
      cancelAcpElicitationRequestsForSession(sessionId);
      acpChatSessionActions.deleteSnapshot(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error(
        intl.formatMessage(i18n.toastDeleteFailed, { error: errorMessage(error, 'Unknown error') })
      );
    }
  }, [sessionToDelete, forgetSessions, intl]);

  // Folder-less chats get their own section: with no repository to group under
  // they would otherwise land in an "Unknown" workspace group.
  const chatOnlySessions = useMemo(
    () => recentSessions.filter((session) => session.chatOnly),
    [recentSessions]
  );

  const pinnedChatSessions = useMemo(
    () => chatOnlySessions.filter((session) => isPinned(session.id)),
    [chatOnlySessions, isPinned]
  );

  const unpinnedChatSessions = useMemo(
    () => chatOnlySessions.filter((session) => !isPinned(session.id)),
    [chatOnlySessions, isPinned]
  );

  const workspaceSessions = useMemo(
    () => recentSessions.filter((session) => !session.chatOnly),
    [recentSessions]
  );

  const pinnedSessions = useMemo(
    () => workspaceSessions.filter((session) => isPinned(session.id)),
    [workspaceSessions, isPinned]
  );

  const unpinnedSessions = useMemo(
    () => workspaceSessions.filter((session) => !isPinned(session.id)),
    [workspaceSessions, isPinned]
  );

  const unpinnedSessionsByProject = useMemo(
    () => groupSessionsByProject(unpinnedSessions),
    [unpinnedSessions]
  );

  const navFocusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNavExpanded) {
      fetchSessions();
      requestAnimationFrame(() => navFocusRef.current?.focus());
    }
  }, [isNavExpanded, fetchSessions]);

  const [groupedByWorkspace, setGroupedByWorkspace] = useState(true);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const toggleProjectCollapsed = useCallback((path: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (!isNavExpanded) return null;

  const homeNavItem = NAV_ITEMS.find((item) => item.id === 'home');
  const newChatLabel = homeNavItem ? getNavItemLabel(homeNavItem, intl) : '';
  const newChatOnlyLabel = intl.formatMessage(i18n.newChat);
  const backLabel = intl.formatMessage(i18n.goBack);
  const forwardLabel = intl.formatMessage(i18n.goForward);
  const groupLabel = intl.formatMessage(i18n.groupChats);

  const renderSessionRow = (session: SessionListItem) => (
    <SessionRow
      key={session.id}
      session={session}
      active={session.id === activeSessionId}
      isLiveVoiceActive={session.id === activeLiveVoiceSessionId}
      status={sessionStatuses.get(session.id)}
      isPinned={isPinned(session.id)}
      onClick={() => {
        clearUnread(session.id);
        handleSessionClick(session.id);
      }}
      onRenamed={fetchSessions}
      onTogglePin={handleTogglePin}
      onMarkUnread={handleMarkUnread}
      onFork={handleFork}
      onCopyTranscript={handleCopyTranscript}
      onDelete={handleDelete}
    />
  );

  return (
    <motion.div
      ref={navFocusRef}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('bg-background-primary outline-none flex flex-col h-full', className)}
    >
      {/* The panel-toggle button floats above the sidebar in AppLayout (kept
          traffic-light aware); history controls sit at the top-right. */}
      <div className="flex h-[48px] flex-shrink-0 items-start justify-end gap-1 pr-1.5 pt-[3px] no-drag">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              shape="round"
              aria-label={backLabel}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{backLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              shape="round"
              aria-label={forwardLabel}
              onClick={() => navigate(1)}
            >
              <ArrowRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{forwardLabel}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-1.5 flex flex-col gap-[1.5px] px-[3px]">
        {NAV_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            active={isActive(item.path)}
            onClick={() => handleNavClick(item.path)}
          />
        ))}
      </div>

      <div className="mt-3.5 flex min-h-0 flex-1 flex-col overflow-y-auto px-[3px] pb-2">
        <SectionHeader label={intl.formatMessage(i18n.chats)} />
        <button
          onClick={() => void handleStartChat()}
          disabled={isStartingChat}
          data-testid="sidebar-start-chat"
          className="flex h-8 w-full items-center gap-2.5 rounded-[10px] px-2 text-sm text-text-secondary transition-colors hover:bg-background-tertiary/60 hover:text-text-primary disabled:opacity-60"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate text-left">{newChatOnlyLabel}</span>
        </button>
        <div className="flex flex-col gap-[1.5px]">
          {pinnedChatSessions.length > 0 && (
            <>
              <SectionHeader label={intl.formatMessage(i18n.pinned)} />
              {pinnedChatSessions.map((session) => renderSessionRow(session))}
              <div className="h-2.5" aria-hidden="true" />
            </>
          )}
          {unpinnedChatSessions.map((session) => renderSessionRow(session))}
          {chatOnlySessions.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-secondary">
              {intl.formatMessage(isLoadingSessions ? i18n.loadingChats : i18n.noChats)}
            </div>
          )}
        </div>

        <div className="mt-3.5">
          <SectionHeader label={intl.formatMessage(i18n.projects)} />
          <button
            onClick={() => handleNavClick('/')}
            className="flex h-8 w-full items-center gap-2.5 rounded-[10px] px-2 text-sm text-text-secondary transition-colors hover:bg-background-tertiary/60 hover:text-text-primary"
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate text-left">{intl.formatMessage(i18n.newProject)}</span>
          </button>
        </div>

        <div className="mt-3.5">
          <SectionHeader
            label={intl.formatMessage(i18n.workspaces)}
            actions={
              <div className="flex items-center gap-3 pr-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      shape="round"
                      aria-pressed={groupedByWorkspace}
                      aria-label={groupLabel}
                      onClick={() => setGroupedByWorkspace((value) => !value)}
                    >
                      <ListFilter />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{groupLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      shape="round"
                      aria-label={newChatLabel}
                      onClick={() => handleNavClick('/')}
                    >
                      <SquarePen />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{newChatLabel}</TooltipContent>
                </Tooltip>
              </div>
            }
          />
          <div className="flex flex-col gap-[1.5px]">
            {pinnedSessions.length > 0 && (
              <>
                <SectionHeader label={intl.formatMessage(i18n.pinned)} />
                {pinnedSessions.map((session) => renderSessionRow(session))}
                <div className="h-2.5" aria-hidden="true" />
              </>
            )}
            {unpinnedSessions.length === 0
              ? null
              : groupedByWorkspace
                ? unpinnedSessionsByProject.map((group: ProjectGroup, index: number) => {
                    const isCollapsed = collapsedProjects.has(group.path);
                    const previousGroup = index > 0 ? unpinnedSessionsByProject[index - 1] : null;
                    const previousRenderedSessions =
                      previousGroup !== null &&
                      previousGroup.sessions.length > 0 &&
                      !collapsedProjects.has(previousGroup.path);
                    return (
                      <React.Fragment key={group.path}>
                        <button
                          onClick={() => toggleProjectCollapsed(group.path)}
                          aria-expanded={!isCollapsed}
                          className={cn(
                            'flex h-8 w-full items-center gap-2.5 rounded-[10px] px-2 text-sm transition-colors',
                            'text-text-primary hover:bg-background-tertiary/60',
                            previousRenderedSessions && 'mt-2.5'
                          )}
                          title={group.path}
                        >
                          {isCollapsed ? (
                            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-text-secondary" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-text-secondary" />
                          )}
                          <span className="truncate text-left">{group.label}</span>
                        </button>
                        {!isCollapsed && group.sessions.map((session) => renderSessionRow(session))}
                      </React.Fragment>
                    );
                  })
                : unpinnedSessions.map((session) => renderSessionRow(session))}
          </div>
        </div>
      </div>

      <NavigationFooter
        settingsActive={isActive(SETTINGS_NAV_ITEM.path)}
        onOpenSettings={(section) =>
          handleNavClick(
            section ? `${SETTINGS_NAV_ITEM.path}?section=${section}` : SETTINGS_NAV_ITEM.path
          )
        }
      />

      <ConfirmationModal
        isOpen={sessionToDelete !== null}
        title={intl.formatMessage(i18n.deleteDialogTitle)}
        message={intl.formatMessage(i18n.deleteDialogMessage, {
          name: sessionToDelete?.name || intl.formatMessage(i18n.untitledSession),
        })}
        confirmLabel={intl.formatMessage(i18n.actionDelete)}
        cancelLabel={intl.formatMessage(i18n.cancel)}
        confirmVariant="destructive"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setSessionToDelete(null)}
      />
    </motion.div>
  );
};
