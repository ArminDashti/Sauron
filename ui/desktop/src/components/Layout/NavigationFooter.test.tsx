import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NavigationFooter from './NavigationFooter';
import { IntlTestWrapper } from '../../i18n/test-utils';

// Radix Tooltip positioning (floating-ui) needs ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const renderFooter = (onOpenSettings = vi.fn()) => {
  render(
    <IntlTestWrapper>
      <NavigationFooter settingsActive={false} onOpenSettings={onOpenSettings} />
    </IntlTestWrapper>
  );
  return onOpenSettings;
};

describe('NavigationFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electron.getUserProfile = vi.fn(() => Promise.resolve({ username: 'armin' }));
    window.electron.openExternal = vi.fn(() => Promise.resolve('opened' as const));
  });

  it('shows the local user name with their initial as the avatar', async () => {
    renderFooter();

    expect(await screen.findByText('Armin')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to a generic label when the account name cannot be read', async () => {
    window.electron.getUserProfile = vi.fn(() => Promise.resolve({ username: '' }));
    renderFooter();

    expect(await screen.findByText('You')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('opens the settings route from the settings button', async () => {
    const onOpenSettings = renderFooter();
    await screen.findByText('Armin');

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('opens the feedback page from the feedback button', async () => {
    renderFooter();
    await screen.findByText('Armin');

    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() =>
      expect(window.electron.openExternal).toHaveBeenCalledWith(
        'https://github.com/aaif-goose/goose/issues/new/choose'
      )
    );
  });
});
