import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navigation } from './NavigationPanel';
import { NavigationProvider } from './NavigationContext';
import { IntlTestWrapper } from '../../i18n/test-utils';
import { useNavigationSessions } from '../../hooks/useNavigationSessions';
import { groupSessionsByProject } from '../../utils/projectSessions';
import { acpDeleteSession, acpExportSession, acpForkSession } from '../../acp/sessions';
import { startNewSession } from '../../sessions';
import type { SessionListItem } from '../../acp/sessions';

vi.mock('../../hooks/useNavigationSessions', () => ({
  useNavigationSessions: vi.fn(),
}));

vi.mock('../../acp/sessions', () => ({
  acpRenameSession: vi.fn(),
  acpDeleteSession: vi.fn(),
  acpExportSession: vi.fn(),
  acpForkSession: vi.fn(),
}));

vi.mock('../../acp/chatSessionStore', () => ({
  acpChatSessionActions: { deleteSnapshot: vi.fn() },
}));

vi.mock('../../acp/permissionRequests', () => ({
  cancelAcpPermissionRequestsForSession: vi.fn(),
}));

vi.mock('../../acp/elicitationRequests', () => ({
  cancelAcpElicitationRequestsForSession: vi.fn(),
}));

vi.mock('../ConfigContext', () => ({
  useConfig: () => ({ extensionsList: [] }),
}));

vi.mock('../../sessions', () => ({
  startNewSession: vi.fn(),
}));

const iso = (secondsAgo: number) =>
  new Date((Math.floor(Date.now() / 1000) - secondsAgo) * 1000).toISOString();

const sessions: SessionListItem[] = [
  {
    id: 's1',
    name: 'Hot module replacement setup',
    workingDir: '/repo/Sauron',
    updatedAt: iso(7 * 60),
    lastMessageAt: iso(7 * 60),
    messageCount: 4,
    createdAt: iso(8 * 60),
    chatOnly: false,
  },
  {
    id: 's2',
    name: 'Rebuild goose UI status',
    workingDir: '/repo/Sauron',
    updatedAt: iso(13 * 60),
    lastMessageAt: iso(13 * 60),
    messageCount: 2,
    createdAt: iso(20 * 60),
    chatOnly: false,
  },
  {
    id: 's3',
    name: 'Add these:',
    workingDir: '/repo/aipedia',
    updatedAt: iso(12 * 3600),
    messageCount: 0,
    createdAt: iso(12 * 3600),
    chatOnly: false,
  },
];

const renderNavigation = () =>
  render(
    <IntlTestWrapper>
      <MemoryRouter>
        <NavigationProvider>
          <Navigation activeLiveVoiceSessionId={null} />
        </NavigationProvider>
      </MemoryRouter>
    </IntlTestWrapper>
  );

describe('Navigation sidebar', () => {
  beforeEach(() => {
    vi.mocked(useNavigationSessions).mockReturnValue({
      recentSessions: sessions,
      recentSessionsByProject: groupSessionsByProject(sessions),
      isLoadingSessions: false,
      activeSessionId: 's1',
      fetchSessions: vi.fn(),
      handleNavClick: vi.fn(),
      handleSessionClick: vi.fn(),
    });
  });

  it('renders the primary navigation and section headers', () => {
    renderNavigation();

    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
  });

  it('groups sessions under workspace folders with relative timestamps', () => {
    renderNavigation();

    expect(screen.getByText('Sauron')).toBeInTheDocument();
    expect(screen.getByText('aipedia')).toBeInTheDocument();
    expect(screen.getByText('Hot module replacement setup')).toBeInTheDocument();
    expect(screen.getByText('Rebuild goose UI status')).toBeInTheDocument();
    expect(screen.getByText('Add these:')).toBeInTheDocument();
    expect(screen.getByText('7m')).toBeInTheDocument();
    expect(screen.getByText('13m')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();
  });

  it('highlights the active session and hollow-marks empty sessions', () => {
    renderNavigation();

    const activeRow = screen.getByText('7m').closest('div');
    expect(activeRow?.className).toContain('bg-background-tertiary');

    const emptyRow = screen.getByText('12h').closest('div');
    expect(emptyRow?.querySelector('.border-text-tertiary')).not.toBeNull();
    expect(emptyRow?.querySelector('.bg-text-tertiary')).toBeNull();

    const activeFilledDot = screen.getByText('7m').closest('div');
    expect(activeFilledDot?.querySelector('.bg-text-tertiary')).not.toBeNull();
  });

  it('collapses a workspace when its folder row is clicked', async () => {
    renderNavigation();

    const folder = screen.getByRole('button', { name: /Sauron/ });
    expect(folder).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(folder);
    expect(folder).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Hot module replacement setup')).not.toBeInTheDocument();
    expect(screen.getByText('Add these:')).toBeInTheDocument();
  });
});

describe('Navigation sidebar chat context menu', () => {
  const openMenuOn = async (sessionName: string) => {
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getByText(sessionName),
    });
  };

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useNavigationSessions).mockReturnValue({
      recentSessions: sessions,
      recentSessionsByProject: groupSessionsByProject(sessions),
      isLoadingSessions: false,
      activeSessionId: 's1',
      fetchSessions: vi.fn(),
      handleNavClick: vi.fn(),
      handleSessionClick: vi.fn(),
    });
  });

  it('lists every chat action when a chat is right-clicked', async () => {
    renderNavigation();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await openMenuOn('Hot module replacement setup');

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    for (const label of ['Pin', 'Rename', 'Mark as Unread', 'Fork', 'Copy Transcript', 'Delete']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }
  });

  it('does not open the menu on a plain left click', async () => {
    renderNavigation();

    await userEvent.click(screen.getByText('Hot module replacement setup'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('moves a pinned chat into the Pinned section and offers Unpin next time', async () => {
    renderNavigation();

    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    await openMenuOn('Rebuild goose UI status');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Pin' }));

    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('sessions_pinned') ?? '[]')).toEqual(['s2']);

    await openMenuOn('Rebuild goose UI status');
    expect(await screen.findByRole('menuitem', { name: 'Unpin' })).toBeInTheDocument();
  });

  it('marks a chat as unread and then disables the action', async () => {
    renderNavigation();

    expect(screen.queryByLabelText('Has new activity')).not.toBeInTheDocument();

    await openMenuOn('Hot module replacement setup');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark as Unread' }));

    await waitFor(() => expect(screen.getByLabelText('Has new activity')).toBeInTheDocument());

    await openMenuOn('Hot module replacement setup');
    expect(await screen.findByRole('menuitem', { name: 'Mark as Unread' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('copies the markdown transcript to the clipboard', async () => {
    vi.mocked(acpExportSession).mockResolvedValue('# transcript');
    renderNavigation();

    await openMenuOn('Hot module replacement setup');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Copy Transcript' }));

    expect(acpExportSession).toHaveBeenCalledWith('s1', 'markdown');
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# transcript'));
  });

  it('forks the chat', async () => {
    vi.mocked(acpForkSession).mockResolvedValue('s4');
    renderNavigation();

    await openMenuOn('Hot module replacement setup');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Fork' }));

    await waitFor(() => expect(acpForkSession).toHaveBeenCalledWith('s1'));
  });

  it('confirms before deleting and drops the pin afterwards', async () => {
    vi.mocked(acpDeleteSession).mockResolvedValue(undefined);
    localStorage.setItem('sessions_pinned', JSON.stringify(['s2']));
    renderNavigation();

    await openMenuOn('Rebuild goose UI status');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    // The session survives until the confirmation is accepted.
    expect(acpDeleteSession).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(acpDeleteSession).toHaveBeenCalledWith('s2'));
    expect(JSON.parse(localStorage.getItem('sessions_pinned') ?? '[]')).toEqual([]);
  });

  it('closes the menu when Escape is pressed', async () => {
    renderNavigation();

    await openMenuOn('Hot module replacement setup');
    expect(await screen.findByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});

describe('Navigation sidebar chats section', () => {
  const workspaceSession: SessionListItem = {
    id: 'w1',
    name: 'Refactor the parser',
    workingDir: '/repo/Sauron',
    updatedAt: iso(60),
    messageCount: 3,
    createdAt: iso(120),
    chatOnly: false,
  };

  const folderLessSession: SessionListItem = {
    id: 'c1',
    name: 'Trip ideas',
    workingDir: '',
    updatedAt: iso(30),
    messageCount: 2,
    createdAt: iso(90),
    chatOnly: true,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useNavigationSessions).mockReturnValue({
      recentSessions: [folderLessSession, workspaceSession],
      recentSessionsByProject: groupSessionsByProject([workspaceSession]),
      isLoadingSessions: false,
      activeSessionId: 'c1',
      fetchSessions: vi.fn(),
      handleNavClick: vi.fn(),
      handleSessionClick: vi.fn(),
    });
  });

  it('lists folder-less chats under Chats, outside the workspace groups', () => {
    renderNavigation();

    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByText('Trip ideas')).toBeInTheDocument();
    expect(screen.getByText('Sauron')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('starts a folder-less chat from the New chat entry', async () => {
    renderNavigation();

    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    await waitFor(() =>
      expect(startNewSession).toHaveBeenCalledWith(undefined, expect.any(Function), '', {
        chatOnly: true,
      })
    );
  });
});
