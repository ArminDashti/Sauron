import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Folder,
  FolderOpen,
  ListFilter,
  Plus,
  SquarePen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigationContext } from './NavigationContext';
import { useConfig } from '../ConfigContext';
import { useNavigationSessions } from '../../hooks/useNavigationSessions';
import {
  NAV_ITEMS,
  SETTINGS_NAV_ITEM,
  getNavItemLabel,
  type NavItem,
} from '../../hooks/useNavigationItems';
import { AppEvents } from '../../constants/events';
import { InlineEditText } from '../common/InlineEditText';
import { Button } from '../ui/button';
import NavigationFooter from './NavigationFooter';
import { SessionIndicators } from '../SessionIndicators';
import { acpRenameSession, type SessionListItem } from '../../acp/sessions';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { formatMessageTimestamp, formatRelativeTimestamp } from '../../utils/timeUtils';
import { cn } from '../../utils';
import type { ProjectGroup } from '../../utils/projectSessions';
import { defineMessages, useIntl } from '../../i18n';

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
  onClick: () => void;
  onRenamed: () => void;
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

const SessionRow: React.FC<SessionRowProps> = ({
  session,
  active,
  isLiveVoiceActive,
  status,
  onClick,
  onRenamed,
}) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
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

  return (
    <Tooltip open={tooltipOpen && !isEditing} onOpenChange={setTooltipOpen} delayDuration={400}>
      <TooltipTrigger asChild>
        <div
          onClick={() => !isEditing && onClick()}
          className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-[10px] cursor-pointer text-sm',
            'hover:bg-background-tertiary/60 transition-colors',
            active && 'bg-background-tertiary'
          )}
        >
          <span aria-hidden="true" className="flex w-3.5 flex-shrink-0 items-center justify-center">
            <span
              className={cn(
                'block h-[7px] w-[7px] rounded-full',
                isEmptySession ? 'border border-text-tertiary' : 'bg-text-tertiary'
              )}
            />
          </span>
          <InlineEditText
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
          <SessionIndicators isStreaming={isStreaming} hasUnread={hasUnread} hasError={hasError} />
          {updatedLabel && (
            <span className="flex-shrink-0 text-text-secondary tabular-nums">{updatedLabel}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-xs text-left">
        <SessionTooltipContent session={session} statusLabel={statusLabel} />
      </TooltipContent>
    </Tooltip>
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
  const { extensionsList } = useConfig();

  const appsExtensionEnabled = !!extensionsList?.find((ext) => ext.name === 'apps')?.enabled;

  const visibleItems = useMemo<NavItem[]>(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.path === '/apps') return appsExtensionEnabled;
      return true;
    });
  }, [appsExtensionEnabled]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const {
    recentSessions,
    recentSessionsByProject,
    isLoadingSessions,
    activeSessionId,
    fetchSessions,
    handleNavClick,
    handleSessionClick,
  } = useNavigationSessions();

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
  const backLabel = intl.formatMessage(i18n.goBack);
  const forwardLabel = intl.formatMessage(i18n.goForward);
  const groupLabel = intl.formatMessage(i18n.groupChats);

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
        {visibleItems.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            active={isActive(item.path)}
            onClick={() => handleNavClick(item.path)}
          />
        ))}
      </div>

      <div className="mt-3.5 flex min-h-0 flex-1 flex-col overflow-y-auto px-[3px] pb-2">
        <SectionHeader label={intl.formatMessage(i18n.projects)} />
        <button
          onClick={() => handleNavClick('/')}
          className="flex h-8 w-full items-center gap-2.5 rounded-[10px] px-2 text-sm text-text-secondary transition-colors hover:bg-background-tertiary/60 hover:text-text-primary"
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate text-left">{intl.formatMessage(i18n.newProject)}</span>
        </button>

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
            {recentSessions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-secondary">
                {intl.formatMessage(isLoadingSessions ? i18n.loadingChats : i18n.noChats)}
              </div>
            ) : groupedByWorkspace ? (
              recentSessionsByProject.map((group: ProjectGroup, index: number) => {
                const isCollapsed = collapsedProjects.has(group.path);
                const previousGroup = index > 0 ? recentSessionsByProject[index - 1] : null;
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
                    {!isCollapsed &&
                      group.sessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          active={session.id === activeSessionId}
                          isLiveVoiceActive={session.id === activeLiveVoiceSessionId}
                          status={sessionStatuses.get(session.id)}
                          onClick={() => {
                            clearUnread(session.id);
                            handleSessionClick(session.id);
                          }}
                          onRenamed={fetchSessions}
                        />
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              recentSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  isLiveVoiceActive={session.id === activeLiveVoiceSessionId}
                  status={sessionStatuses.get(session.id)}
                  onClick={() => {
                    clearUnread(session.id);
                    handleSessionClick(session.id);
                  }}
                  onRenamed={fetchSessions}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <NavigationFooter
        settingsActive={isActive(SETTINGS_NAV_ITEM.path)}
        onOpenSettings={() => handleNavClick(SETTINGS_NAV_ITEM.path)}
      />
    </motion.div>
  );
};
