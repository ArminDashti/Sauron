import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { FontSizeProvider } from '../../../contexts/FontSizeContext';
import { IntlTestWrapper } from '../../../i18n/test-utils';
import { MAX_FONT_SIZE, MIN_FONT_SIZE, DEFAULT_FONT_SIZE } from '../../../utils/fontSize';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('AppearanceSettingsSection font size setting', () => {
  let getSetting: ReturnType<typeof vi.fn>;
  let setSetting: ReturnType<typeof vi.fn>;
  let broadcastFontSizeChange: ReturnType<typeof vi.fn>;

  const renderSection = (fontSize: number = DEFAULT_FONT_SIZE) => {
    getSetting.mockImplementation((key: string) => {
      if (key === 'fontSize') return Promise.resolve(fontSize);
      if (key === 'language') return Promise.resolve('system');
      if (key === 'theme') return Promise.resolve('light');
      if (key === 'useSystemTheme') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    return render(
      <ThemeProvider>
        <FontSizeProvider>
          <AppearanceSettingsSection />
        </FontSizeProvider>
      </ThemeProvider>,
      { wrapper: IntlTestWrapper }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getSetting = vi.fn();
    setSetting = vi.fn().mockResolvedValue(undefined);
    broadcastFontSizeChange = vi.fn();
    window.electron = {
      platform: 'win32',
      getSetting,
      setSetting,
      broadcastFontSizeChange,
      on: vi.fn(),
      off: vi.fn(),
      getMenuBarIconState: vi.fn().mockResolvedValue(true),
      getWakelockState: vi.fn().mockResolvedValue(false),
      openNotificationsSettings: vi.fn().mockResolvedValue(true),
      reloadApp: vi.fn(),
    } as unknown as typeof window.electron;
    document.documentElement.style.fontSize = '';
  });

  it('shows the current font size', async () => {
    renderSection();

    expect(screen.getByText('Font size')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('100%');
    });
    expect(document.documentElement.style.fontSize).toBe('16px');
  });

  it('increases the font size, applies it and persists the change', async () => {
    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('100%');
    });

    await user.click(screen.getByRole('button', { name: 'Increase font size' }));

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('110%');
    });
    expect(document.documentElement.style.fontSize).toBe('17.6px');
    expect(setSetting).toHaveBeenCalledWith('fontSize', 110);
    expect(broadcastFontSizeChange).toHaveBeenCalledWith(110);
  });

  it('decreases the font size and persists the change', async () => {
    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('100%');
    });

    await user.click(screen.getByRole('button', { name: 'Decrease font size' }));

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('90%');
    });
    expect(setSetting).toHaveBeenCalledWith('fontSize', 90);
  });

  it('disables decrease at the minimum size', async () => {
    renderSection(MIN_FONT_SIZE);

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('80%');
    });
    expect(screen.getByRole('button', { name: 'Decrease font size' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase font size' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('disables increase at the maximum size and resets to the default', async () => {
    const user = userEvent.setup();
    renderSection(MAX_FONT_SIZE);

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('160%');
    });
    expect(screen.getByRole('button', { name: 'Increase font size' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease font size' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('100%');
      expect(setSetting).toHaveBeenCalledWith('fontSize', DEFAULT_FONT_SIZE);
    });
  });

  it('disables reset when already at the default size', async () => {
    renderSection(DEFAULT_FONT_SIZE);

    await waitFor(() => {
      expect(screen.getByTestId('font-size-value')).toHaveTextContent('100%');
    });
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
