import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyFontSize, clampFontSize, DEFAULT_FONT_SIZE } from '../utils/fontSize';

interface FontSizeContextValue {
  /** Current font size as a percentage of the default size. */
  fontSize: number;
  /** Clamp, apply, persist and broadcast a new font size. */
  setFontSize: (size: number) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

interface FontSizeProviderProps {
  children: React.ReactNode;
}

export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const [fontSize, setFontSizeState] = useState<number>(DEFAULT_FONT_SIZE);

  // Load the saved preference and apply it before the UI settles.
  useEffect(() => {
    let cancelled = false;

    async function loadFontSizeFromSettings() {
      try {
        const saved = await window.electron.getSetting('fontSize');
        if (cancelled) return;
        const size = typeof saved === 'number' ? clampFontSize(saved) : DEFAULT_FONT_SIZE;
        setFontSizeState(size);
        applyFontSize(size);
      } catch (error) {
        console.warn('[FontSizeContext] Failed to load font size setting:', error);
      }
    }

    loadFontSizeFromSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFontSize = useCallback(async (size: number) => {
    const next = clampFontSize(size);
    setFontSizeState(next);
    applyFontSize(next);

    try {
      await window.electron.setSetting('fontSize', next);
    } catch (error) {
      console.warn('[FontSizeContext] Failed to save font size setting:', error);
    }

    window.electron?.broadcastFontSizeChange?.(next);
  }, []);

  // Sync font size changes made in other windows.
  useEffect(() => {
    if (!window.electron) return;

    const handleFontSizeChanged = (_event: unknown, ...args: unknown[]) => {
      const size = clampFontSize(Number(args[0]));
      setFontSizeState(size);
      applyFontSize(size);
    };

    window.electron.on('font-size-changed', handleFontSizeChanged);
    return () => {
      window.electron.off('font-size-changed', handleFontSizeChanged);
    };
  }, []);

  const value: FontSizeContextValue = {
    fontSize,
    setFontSize,
  };

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize(): FontSizeContextValue {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
