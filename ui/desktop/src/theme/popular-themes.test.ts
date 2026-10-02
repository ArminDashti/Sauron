import { describe, expect, it } from 'vitest';
import {
  POPULAR_THEME_IDS,
  POPULAR_THEME_LABELS,
  popularThemes,
  themeSwatch,
} from './popular-themes';
import { isThemeId, lightTokens, themes } from './theme-tokens';

describe('popular themes', () => {
  it('registers every preset in the theme registry', () => {
    expect(POPULAR_THEME_IDS).toHaveLength(10);

    for (const id of POPULAR_THEME_IDS) {
      expect(themes[id]).toBe(popularThemes[id]);
      expect(isThemeId(id)).toBe(true);
      expect(POPULAR_THEME_LABELS[id]).toBeTruthy();
    }
  });

  it('defines a value for every semantic token', () => {
    for (const id of POPULAR_THEME_IDS) {
      const tokens = popularThemes[id].tokens;
      for (const key of Object.keys(lightTokens) as Array<keyof typeof tokens>) {
        expect(typeof tokens[key]).toBe('string');
        expect(tokens[key]).not.toBe('');
      }
    }
  });

  it('exposes a background and accent swatch for previews', () => {
    for (const id of POPULAR_THEME_IDS) {
      const swatch = themeSwatch(id);
      expect(swatch.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(swatch.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('rejects ids that are not registered themes', () => {
    expect(isThemeId('not-a-theme')).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
  });
});
