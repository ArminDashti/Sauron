import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('shows CPU and memory usage percentages above the profile row', async () => {
    window.electron.getSystemUsage = vi.fn(() =>
      Promise.resolve({
        cpuPercent: 12,
        memoryPercent: 34,
        diskPercent: 56,
        downloadMbps: 12,
        uploadMbps: 3,
      })
    );
    renderFooter();

    const usageRow = await screen.findByTestId('system-usage');
    expect(usageRow).toHaveTextContent('CPU 12%');
    expect(usageRow).toHaveTextContent('Mem 34%');
    expect(within(usageRow).getByLabelText('CPU 12%')).toBeInTheDocument();
    expect(within(usageRow).getByLabelText('Disk Usage 56%')).toBeInTheDocument();
    expect(within(usageRow).getByLabelText('Download 12 Mbps')).toBeInTheDocument();
    expect(within(usageRow).getByLabelText('Upload 3 Mbps')).toBeInTheDocument();
    expect(within(usageRow).getByLabelText('Download 12 Mbps')).toBeInTheDocument();
    expect(within(usageRow).getByLabelText('Upload 3 Mbps')).toBeInTheDocument();
    expect(within(usageRow).queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the usage row when system usage cannot be read', async () => {
    window.electron.getSystemUsage = vi.fn(() => Promise.reject(new Error('unavailable')));
    renderFooter();

    await screen.findByText('Armin');
    expect(screen.queryByTestId('system-usage')).not.toBeInTheDocument();
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
