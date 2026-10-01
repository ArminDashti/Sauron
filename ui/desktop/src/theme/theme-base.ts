/**
 * Shared theme token plumbing.
 *
 * Kept separate from `theme-tokens.ts` so named theme presets
 * (`popular-themes.ts`) can build on the shared base tokens without creating a
 * circular import with the theme registry.
 */
import type { McpUiStyleVariableKey } from '@modelcontextprotocol/ext-apps/app-bridge';

export type ThemeTokens = Record<McpUiStyleVariableKey, string>;

// Subset of keys that are the same across all themes.
export type BaseTokenKey = Extract<
  McpUiStyleVariableKey,
  `--font-${string}` | `--border-radius-${string}` | `--border-width-${string}`
>;

export type ColorTokenKey = Exclude<McpUiStyleVariableKey, BaseTokenKey>;

// Theme-specific color/shadow tokens only.
export type ColorTokens = Pick<ThemeTokens, ColorTokenKey>;

export type ThemeVariant = 'light' | 'dark';

export interface ThemeDefinition {
  variant: ThemeVariant;
  tokens: ThemeTokens;
}

// ---------------------------------------------------------------------------
// Base tokens — shared across every theme
// ---------------------------------------------------------------------------
export const baseTokens: Pick<ThemeTokens, BaseTokenKey> = {
  // Typography — families
  '--font-sans': "'Cash Sans', sans-serif",
  '--font-mono': 'monospace',

  // Typography — weights
  '--font-weight-normal': '400',
  '--font-weight-medium': '500',
  '--font-weight-semibold': '600',
  '--font-weight-bold': '700',

  // Typography — text sizes
  '--font-text-xs-size': '0.75rem',
  '--font-text-sm-size': '0.875rem',
  '--font-text-md-size': '1rem',
  '--font-text-lg-size': '1.125rem',

  // Typography — heading sizes
  '--font-heading-xs-size': '1rem',
  '--font-heading-sm-size': '1.125rem',
  '--font-heading-md-size': '1.25rem',
  '--font-heading-lg-size': '1.5rem',
  '--font-heading-xl-size': '1.875rem',
  '--font-heading-2xl-size': '2.25rem',
  '--font-heading-3xl-size': '3rem',

  // Typography — text line heights
  '--font-text-xs-line-height': '1rem',
  '--font-text-sm-line-height': '1.25rem',
  '--font-text-md-line-height': '1.5rem',
  '--font-text-lg-line-height': '1.75rem',

  // Typography — heading line heights
  '--font-heading-xs-line-height': '1.5rem',
  '--font-heading-sm-line-height': '1.75rem',
  '--font-heading-md-line-height': '1.75rem',
  '--font-heading-lg-line-height': '2rem',
  '--font-heading-xl-line-height': '2.25rem',
  '--font-heading-2xl-line-height': '2.5rem',
  '--font-heading-3xl-line-height': '3.5rem',

  // Border radius
  '--border-radius-xs': '2px',
  '--border-radius-sm': '4px',
  '--border-radius-md': '8px',
  '--border-radius-lg': '12px',
  '--border-radius-xl': '16px',
  '--border-radius-full': '9999px',

  // Border width
  '--border-width-regular': '1px',
};

export const MONO_FONT_STACK =
  'ui-monospace, "SFMono-Regular", "Menlo", "Cascadia Mono", "Segoe UI Mono", monospace';

export type ShadowTokens = Pick<
  ColorTokens,
  '--shadow-hairline' | '--shadow-sm' | '--shadow-md' | '--shadow-lg'
>;

// Shadow ramps: dark surfaces need heavier shadows to read as elevation.
export const lightShadows: ShadowTokens = {
  '--shadow-hairline': '0 0 0 1px rgba(0, 0, 0, 0.05)',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
};

export const darkShadows: ShadowTokens = {
  '--shadow-hairline': '0 0 0 1px rgba(0, 0, 0, 0.2)',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
};
