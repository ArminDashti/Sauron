import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlTestWrapper } from '../../i18n/test-utils';

const listGitWorktreeDirs = vi.fn<(dir: string) => Promise<string[]>>();
const listRecentDirs = vi.fn<() => Promise<string[]>>();

vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dir-menu" data-open={open}>
      <button onClick={() => onOpenChange(true)}>Open dir menu</button>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => <button onClick={onSelect}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('../ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { DirSwitcher } from './DirSwitcher';

const renderDirSwitcher = () =>
  render(
    <DirSwitcher className="" sessionId="session-1" workingDir="/repo/main" />,
    { wrapper: IntlTestWrapper }
  );

const openMenu = async () => {
  // The worktree preference resolves over IPC after mount, so settle it first.
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Open dir menu' }));
  await waitFor(() => expect(screen.getByTestId('dir-menu')).toHaveAttribute('data-open', 'true'));
};

const setWorktreesSetting = (enabled: boolean) => {
  window.electron.getSetting = (() => Promise.resolve(enabled)) as typeof window.electron.getSetting;
};

describe('DirSwitcher worktree handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecentDirs.mockResolvedValue([]);
    listGitWorktreeDirs.mockResolvedValue(['/repo/main', '/repo/feature']);
    Object.assign(window.electron, { listRecentDirs, listGitWorktreeDirs });
  });

  it('lists git worktrees when the setting is enabled', async () => {
    setWorktreesSetting(true);
    renderDirSwitcher();

    await openMenu();

    expect(listGitWorktreeDirs).toHaveBeenCalledWith('/repo/main');
    expect(await screen.findByText('Git worktrees')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('ignores git worktrees when the setting is disabled', async () => {
    setWorktreesSetting(false);
    renderDirSwitcher();

    await openMenu();

    await waitFor(() => expect(screen.queryByText('Git worktrees')).not.toBeInTheDocument());
    expect(listGitWorktreeDirs).not.toHaveBeenCalled();
    expect(screen.queryByText('feature')).not.toBeInTheDocument();
  });
});