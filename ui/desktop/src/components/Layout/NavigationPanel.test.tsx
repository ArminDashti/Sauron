import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navigation } from './NavigationPanel';
import { NavigationProvider } from './NavigationContext';
import { IntlTestWrapper } from '../../i18n/test-utils';
import { useNavigationSessions } from '../../hooks/useNavigationSessions';
import { groupSessionsByProject } from '../../utils/projectSessions';
import type { SessionListItem } from '../../acp/sessions';

vi.mock('../../hooks/useNavigationSessions', () => ({
  useNavigationSessions: vi.fn(),
}));

vi.mock('../../acp/sessions', () => ({
  acpRenameSession: vi.fn(),
}));

vi.mock('../ConfigContext', () => ({
  useConfig: () => ({ extensionsList: [] }),
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
  },
  {
    id: 's2',
    name: 'Rebuild goose UI status',
    workingDir: '/repo/Sauron',
    updatedAt: iso(13 * 60),
    lastMessageAt: iso(13 * 60),
    messageCount: 2,
    createdAt: iso(20 * 60),
  },
  {
    id: 's3',
    name: 'Add these:',
    workingDir: '/repo/aipedia',
    updatedAt: iso(12 * 3600),
    messageCount: 0,
    createdAt: iso(12 * 3600),
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
