import { describe, expect, it } from 'vitest';
import {
  customThemeColorSlots,
  defaultCustomTheme,
  normalizeCustomTheme,
  slotColor,
  withSlotColor,
} from './custom-theme';
import { isThemeId, lightTokens, resolveThemeTokens, themeSwatchFor } from './theme-tokens';

describe('custom theme', () => {
  it('registers the custom theme id', () => {
    expect(isThemeId('custom')).toBe(true);
  });

  it('layers overrides on the chosen base variant', () => {
    const tokens = resolveThemeTokens('custom', {
      name: 'Test',
      variant: 'light',
      colors: { '--color-background-primary': '#123456' },
    });

    expect(tokens['--color-background-primary']).toBe('#123456');
    expect(tokens['--color-text-primary']).toBe(lightTokens['--color-text-primary']);
  });

  it('ignores persisted values it cannot use', () => {
    expect(normalizeCustomTheme(undefined)).toEqual(defaultCustomTheme);
    expect(normalizeCustomTheme({ name: '  ', variant: 'sepia' })).toEqual(defaultCustomTheme);
    expect(normalizeCustomTheme({ colors: { '--color-text-primary': 5 } }).colors).toEqual({});
    expect(normalizeCustomTheme({ name: 'Night', variant: 'light' })).toEqual({
      name: 'Night',
      variant: 'light',
      colors: {},
    });
  });

  it('writes and clears every token a slot owns', () => {
    const slot = customThemeColorSlots.find((candidate) => candidate.id === 'danger');
    if (!slot) throw new Error('danger slot is missing');

    const colored = withSlotColor({}, slot, '#ff0000');
    expect(Object.keys(colored)).toHaveLength(slot.tokens.length);
    expect(slotColor(colored, slot)).toBe('#ff0000');
    expect(withSlotColor(colored, slot, '')).toEqual({});
  });

  it('previews the custom theme with the base palette', () => {
    const swatch = themeSwatchFor('custom', defaultCustomTheme);
    expect(swatch.background).toMatch(/^#/);
    expect(swatch.accent).toMatch(/^#/);
  });
});
