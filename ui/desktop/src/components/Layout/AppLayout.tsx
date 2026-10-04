import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IpcRendererEvent } from 'electron';
import { Outlet, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { PanelLeft, PanelRight } from 'lucide-react';
import { defineMessages, useIntl } from '../../i18n';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import ChatSessionsContainer from '../ChatSessionsContainer';
import { ChangesPanel } from '../changes/ChangesPanel';
import { useChatContext } from '../../contexts/ChatContext';
import { NavigationProvider, useNavigationContext } from './NavigationContext';
import { Navigation } from './NavigationPanel';
import { CHANGES_DIMENSIONS, Z_INDEX } from './constants';
import { cn } from '../../utils';
import { UserInput } from '../../types/message';
import type { LiveVoiceController } from '../../liveVoice/useLiveVoice';

const i18n = defineMessages({
  openNavigation: {
    id: 'appLayout.openNavigation',
    defaultMessage: 'Open navigation',
  },
  collapseNavigation: {
    id: 'appLayout.collapseNavigation',
    defaultMessage: 'Collapse navigation',
  },
  showChanges: {
    id: 'appLayout.showChanges',
    defaultMessage: 'Expand right sidebar',
  },
  hideChanges: {
    id: 'appLayout.hideChanges',
    defaultMessage: 'Collapse right sidebar',
  },
});

interface AppLayoutContentProps {
  activeSessions: Array<{
    sessionId: string;
    initialMessage?: UserInput;
    noAutoSubmit?: boolean;
  }>;
  liveVoice: LiveVoiceController;
}

const AppLayoutContent: React.FC<AppLayoutContentProps> = ({ activeSessions, liveVoice }) => {
  const intl = useIntl();
  const location = useLocation();
  const safeIsMacOS = (window?.electron?.platform || 'darwin') === 'darwin';
  const chatContext = useChatContext();
  const isOnPairRoute = location.pathname === '/pair';
  const isOnSettingsRoute = location.pathname === '/settings';

  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!safeIsMacOS) return;
    window.electron
      .getIsFullScreen()
      .then(setIsFullScreen)
      .catch(() => {});
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => {
      setIsFullScreen(Boolean(args[0]));
    };
    window.electron.on('fullscreen-change', handler);
    return () => window.electron.off('fullscreen-change', handler);
  }, [safeIsMacOS]);

  const { isNavExpanded, setIsNavExpanded, navWidth, setNavWidth } = useNavigationContext();
  const [isDragging, setIsDragging] = useState(false);
  const resizeTarget = useRef<'nav' | 'changes' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const [isChangesExpanded, setIsChangesExpandedState] = useState<boolean>(() => {
    const stored = localStorage.getItem('changes_panel_expanded');
    return stored === null ? false : stored === 'true';
  });

  const setIsChangesExpanded = useCallback((expanded: boolean) => {
    setIsChangesExpandedState(expanded);
    localStorage.setItem('changes_panel_expanded', String(expanded));
  }, []);

  const [changesWidth, setChangesWidthState] = useState<number>(() => {
    const stored = localStorage.getItem('changes_panel_width');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (
        !isNaN(parsed) &&
        parsed >= CHANGES_DIMENSIONS.MIN_WIDTH &&
        parsed <= CHANGES_DIMENSIONS.MAX_WIDTH
      ) {
        return parsed;
      }
    }
    return CHANGES_DIMENSIONS.CHANGES_WIDTH;
  });

  const setChangesWidth = useCallback((width: number) => {
    const clamped = Math.min(
      CHANGES_DIMENSIONS.MAX_WIDTH,
      Math.max(CHANGES_DIMENSIONS.MIN_WIDTH, width)
    );
    setChangesWidthState(clamped);
    localStorage.setItem('changes_panel_width', String(clamped));
  }, []);

  const handleNavResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizeTarget.current = 'nav';
      startX.current = e.clientX;
      startWidth.current = navWidth;
      setIsDragging(true);
      e.preventDefault();
    },
    [navWidth]
  );

  const handleChangesResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizeTarget.current = 'changes';
      startX.current = e.clientX;
      startWidth.current = changesWidth;
      setIsDragging(true);
      e.preventDefault();
    },
    [changesWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = resizeTarget.current;
      if (!target) return;
      const delta = e.clientX - startX.current;
      if (target === 'nav') {
        setNavWidth(startWidth.current + delta);
      } else {
        // Dragging the left edge leftwards makes the panel wider.
        setChangesWidth(startWidth.current - delta);
      }
    };
    const handleMouseUp = () => {
      if (resizeTarget.current) {
        resizeTarget.current = null;
        setIsDragging(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setNavWidth, setChangesWidth]);

  if (!chatContext) {
    throw new Error('AppLayoutContent must be used within ChatProvider');
  }

  const { setChat } = chatContext;

  const needsTrafficLightInset = safeIsMacOS && !isFullScreen;
  const headerPadding = needsTrafficLightInset ? 'pl-[96px]' : 'pl-4';
  const headerTop = needsTrafficLightInset ? 'top-[14px]' : 'top-[11px]';
  const navToggleTitle = intl.formatMessage(
    isNavExpanded ? i18n.collapseNavigation : i18n.openNavigation
  );
  const changesToggleTitle = intl.formatMessage(
    isChangesExpanded ? i18n.hideChanges : i18n.showChanges
  );

  return (
    <div className="flex flex-1 w-full h-full relative animate-fade-in bg-background-primary flex-row">
      <div
        style={{ zIndex: Z_INDEX.HEADER }}
        className={cn('absolute flex items-center gap-1', headerPadding, headerTop, 'ml-1.5')}
      >
        <Button
          onClick={() => setIsNavExpanded(!isNavExpanded)}
          className="no-drag hover:!bg-background-tertiary"
          variant="ghost"
          size="xs"
          title={navToggleTitle}
          aria-label={navToggleTitle}
          aria-expanded={isNavExpanded}
        >
          <PanelLeft className="w-5 h-5" />
        </Button>
        {/* The right sidebar toggle shares the left header cluster to avoid the
            chat watermark at the top-right corner. */}
        <Button
          onClick={() => setIsChangesExpanded(!isChangesExpanded)}
          className="no-drag hover:!bg-background-tertiary"
          variant="ghost"
          size="xs"
          title={changesToggleTitle}
          aria-label={changesToggleTitle}
          aria-expanded={isChangesExpanded}
        >
          <PanelRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Main content with navigation. Shared white canvas; the sidebar is a
          rounded outlined card floating on it with breathing room. */}
      <div className="flex flex-1 w-full h-full min-h-0 flex-row">
        <motion.div
          key="nav"
          initial={false}
          animate={{ width: isNavExpanded ? navWidth : 0 }}
          transition={
            isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }
          }
          style={{ height: '100%' }}
          className="relative flex-shrink-0 overflow-hidden h-full p-2"
        >
          <div className="w-full h-full overflow-hidden rounded-xl border border-border-primary">
            <Navigation activeLiveVoiceSessionId={liveVoice.activeSessionId} />
          </div>
          {isNavExpanded && (
            <div
              className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-border-primary/30 transition-colors"
              onMouseDown={handleNavResizeMouseDown}
            />
          )}
        </motion.div>

        {/* Main content — no border / no card; just flows on the canvas. */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isOnSettingsRoute ? <div className="h-full w-full" aria-hidden="true" /> : <Outlet />}
          {/* Always render ChatSessionsContainer to keep SSE connections alive.
              When navigating away from /pair, hide it with CSS */}
          <div className={isOnPairRoute ? 'contents' : 'hidden'}>
            <ChatSessionsContainer
              setChat={setChat}
              activeSessions={activeSessions}
              liveVoice={liveVoice}
            />
          </div>
        </div>

        {/* Right panel: git changes and diffs, mirroring the sidebar card. */}
        <motion.div
          key="changes"
          initial={false}
          animate={{ width: isChangesExpanded ? changesWidth : 0 }}
          transition={
            isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }
          }
          style={{ height: '100%' }}
          className="relative flex-shrink-0 overflow-hidden h-full p-2"
        >
          <div className="w-full h-full overflow-hidden rounded-xl border border-border-primary">
            {isChangesExpanded && <ChangesPanel onClose={() => setIsChangesExpanded(false)} />}
          </div>
          {isChangesExpanded && (
            <div
              className="absolute left-0 top-0 h-full w-2 cursor-col-resize hover:bg-border-primary/30 transition-colors"
              onMouseDown={handleChangesResizeMouseDown}
            />
          )}
        </motion.div>
      </div>

      <Dialog open={isOnSettingsRoute}>
        <DialogContent
          aria-describedby={undefined}
          className="h-[min(90vh,900px)] max-h-[calc(100vh-2rem)] w-[min(92vw,1040px)] max-w-none overflow-hidden border-border-primary bg-background-primary p-0 shadow-2xl duration-300"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            window.history.back();
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            event.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <Outlet />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface AppLayoutProps {
  activeSessions: Array<{
    sessionId: string;
    initialMessage?: UserInput;
    noAutoSubmit?: boolean;
  }>;
  liveVoice: LiveVoiceController;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ activeSessions, liveVoice }) => {
  return (
    <NavigationProvider>
      <AppLayoutContent activeSessions={activeSessions} liveVoice={liveVoice} />
    </NavigationProvider>
  );
};
