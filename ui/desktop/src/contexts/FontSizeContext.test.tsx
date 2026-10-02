import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FontSizeProvider, useFontSize } from './FontSizeContext';
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE } from '../utils/fontSize';

function Probe() {
  const { fontSize, setFontSize } = useFontSize();
  return (
    <div>
      <span data-testid="font-size">{fontSize}</span>
      <button onClick={() => setFontSize(fontSize + 10)}>increase</button>
    </div>
  );
}

describe('FontSizeProvider', () => {
  let getSetting: ReturnType<typeof vi.fn>;
  let setSetting: ReturnType<typeof vi.fn>;
  let on: ReturnType<typeof vi.fn>;
  let off: ReturnType<typeof vi.fn>;
  let broadcastFontSizeChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSetting = vi.fn().mockResolvedValue(DEFAULT_FONT_SIZE);
    setSetting = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
    off = vi.fn();
    broadcastFontSizeChange = vi.fn();
    window.electron = {
      platform: 'darwin',
      getSetting,
      setSetting,
      on,
      off,
      broadcastFontSizeChange,
    } as unknown as typeof window.electron;
    document.documentElement.style.fontSize = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when used outside a provider', () => {
    function Orphan() {
      useFontSize();
      return null;
    }
    const errorSpy = vi.mocked(console.error).mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useFontSize must be used within a FontSizeProvider');
    errorSpy.mockRestore();
  });

  it('loads and applies the saved font size on mount', async () => {
    getSetting.mockResolvedValue(120);

    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent('120');
    });
    expect(getSetting).toHaveBeenCalledWith('fontSize');
    expect(document.documentElement.style.fontSize).toBe('19.2px');
  });

  it('falls back to the default when the saved value is invalid', async () => {
    getSetting.mockResolvedValue(undefined);

    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent(String(DEFAULT_FONT_SIZE));
    });
    expect(document.documentElement.style.fontSize).toBe('16px');
  });

  it('applies, persists and broadcasts a new font size', async () => {
    const user = userEvent.setup();

    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent(String(DEFAULT_FONT_SIZE));
    });

    await user.click(screen.getByRole('button', { name: 'increase' }));

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent('110');
    });
    expect(document.documentElement.style.fontSize).toBe('17.6px');
    expect(setSetting).toHaveBeenCalledWith('fontSize', 110);
    expect(broadcastFontSizeChange).toHaveBeenCalledWith(110);
  });

  it('applies font size changes broadcast from other windows', async () => {
    render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    await waitFor(() => {
      expect(on).toHaveBeenCalledWith('font-size-changed', expect.any(Function));
    });

    const handler = on.mock.calls.find((call) => call[0] === 'font-size-changed')![1];

    act(() => {
      handler({}, MAX_FONT_SIZE);
    });

    expect(screen.getByTestId('font-size')).toHaveTextContent(String(MAX_FONT_SIZE));
    expect(document.documentElement.style.fontSize).toBe('25.6px');
    // Local state only — the change came from another window.
    expect(setSetting).not.toHaveBeenCalled();
  });

  it('stops listening for font size changes on unmount', async () => {
    const { unmount } = render(
      <FontSizeProvider>
        <Probe />
      </FontSizeProvider>
    );

    await waitFor(() => {
      expect(on).toHaveBeenCalledWith('font-size-changed', expect.any(Function));
    });

    const handler = on.mock.calls.find((call) => call[0] === 'font-size-changed')![1];
    unmount();

    expect(off).toHaveBeenCalledWith('font-size-changed', handler);
  });
});
