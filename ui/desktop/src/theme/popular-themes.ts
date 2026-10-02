/**
 * Popular community themes.
 *
 * Ten widely-used editor/terminal palettes ported to goose's semantic token
 * set. Each preset is described compactly and expanded into the full color
 * token map by `buildColorTokens`, so adding a theme stays a matter of filling
 * in a handful of palette colors.
 */
import {
  baseTokens,
  darkShadows,
  lightShadows,
  type ColorTokens,
  type ThemeDefinition,
  type ThemeVariant,
} from './theme-base';

interface ThemeSpec {
  variant: ThemeVariant;
  /** [background-primary, background-secondary, background-tertiary] */
  bg: [string, string, string];
  /** [text-primary, text-secondary, text-tertiary] */
  text: [string, string, string];
  /** [border-primary, border-secondary, border-tertiary] */
  border: [string, string, string];
  /** background-inverse surface and the color that reads on top of it */
  inverse: { bg: string; on: string };
  /** status colors, reused for background/text/border/ring of each status */
  status: { info: string; danger: string; success: string; warning: string };
  disabled?: { bg?: string; text?: string };
}

function buildColorTokens(spec: ThemeSpec): ColorTokens {
  const [bgPrimary, bgSecondary, bgTertiary] = spec.bg;
  const [textPrimary, textSecondary, textTertiary] = spec.text;
  const [borderPrimary, borderSecondary, borderTertiary] = spec.border;
  const { info, danger, success, warning } = spec.status;
  const disabledBg = spec.disabled?.bg ?? bgTertiary;
  const disabledText = spec.disabled?.text ?? textTertiary;

  return {
    // Backgrounds
    '--color-background-primary': bgPrimary,
    '--color-background-secondary': bgSecondary,
    '--color-background-tertiary': bgTertiary,
    '--color-background-inverse': spec.inverse.bg,
    '--color-background-ghost': 'transparent',
    '--color-background-info': info,
    '--color-background-danger': danger,
    '--color-background-success': success,
    '--color-background-warning': warning,
    '--color-background-disabled': disabledBg,

    // Text
    '--color-text-primary': textPrimary,
    '--color-text-secondary': textSecondary,
    '--color-text-tertiary': textTertiary,
    '--color-text-inverse': spec.inverse.on,
    '--color-text-ghost': textSecondary,
    '--color-text-info': info,
    '--color-text-danger': danger,
    '--color-text-success': success,
    '--color-text-warning': warning,
    '--color-text-disabled': disabledText,

    // Borders
    '--color-border-primary': borderPrimary,
    '--color-border-secondary': borderSecondary,
    '--color-border-tertiary': borderTertiary,
    '--color-border-inverse': textPrimary,
    '--color-border-ghost': 'transparent',
    '--color-border-info': info,
    '--color-border-danger': danger,
    '--color-border-success': success,
    '--color-border-warning': warning,
    '--color-border-disabled': disabledBg,

    // Rings
    '--color-ring-primary': borderSecondary,
    '--color-ring-secondary': borderPrimary,
    '--color-ring-inverse': spec.inverse.on,
    '--color-ring-info': info,
    '--color-ring-danger': danger,
    '--color-ring-success': success,
    '--color-ring-warning': warning,

    ...(spec.variant === 'dark' ? darkShadows : lightShadows),
  };
}

function defineTheme(spec: ThemeSpec): ThemeDefinition {
  return {
    variant: spec.variant,
    tokens: { ...baseTokens, ...buildColorTokens(spec) },
  };
}

/** Nord — arctic, blue-grey. https://www.nordtheme.com */
const nord: ThemeSpec = {
  variant: 'dark',
  bg: ['#2e3440', '#3b4252', '#434c5e'],
  text: ['#eceff4', '#d8dee9', '#81a1c1'],
  border: ['#4c566a', '#434c5e', '#3b4252'],
  inverse: { bg: '#88c0d0', on: '#2e3440' },
  status: { info: '#88c0d0', danger: '#bf616a', success: '#a3be8c', warning: '#ebcb8b' },
  disabled: { bg: '#434c5e', text: '#616e88' },
};

/** Dracula — high-contrast purple. https://draculatheme.com */
const dracula: ThemeSpec = {
  variant: 'dark',
  bg: ['#282a36', '#343746', '#44475a'],
  text: ['#f8f8f2', '#bdc0cf', '#6272a4'],
  border: ['#44475a', '#4d5066', '#383a4a'],
  inverse: { bg: '#bd93f9', on: '#282a36' },
  status: { info: '#8be9fd', danger: '#ff5555', success: '#50fa7b', warning: '#f1fa8c' },
  disabled: { bg: '#44475a', text: '#6272a4' },
};

/** Gruvbox Dark — warm retro. https://github.com/morhetz/gruvbox */
const gruvboxDark: ThemeSpec = {
  variant: 'dark',
  bg: ['#282828', '#3c3836', '#504945'],
  text: ['#ebdbb2', '#d5c4a1', '#a89984'],
  border: ['#504945', '#665c54', '#3c3836'],
  inverse: { bg: '#d79921', on: '#282828' },
  status: { info: '#83a598', danger: '#fb4934', success: '#b8bb26', warning: '#fabd2f' },
  disabled: { bg: '#504945', text: '#928374' },
};

/** Tokyo Night — neon on midnight blue. https://github.com/enkia/tokyo-night-vscode-theme */
const tokyoNight: ThemeSpec = {
  variant: 'dark',
  bg: ['#1a1b26', '#24283b', '#292e42'],
  text: ['#c0caf5', '#a9b1d6', '#565f89'],
  border: ['#292e42', '#3b4261', '#1f2335'],
  inverse: { bg: '#7aa2f7', on: '#1a1b26' },
  status: { info: '#7dcfff', danger: '#f7768e', success: '#9ece6a', warning: '#e0af68' },
  disabled: { bg: '#292e42', text: '#565f89' },
};

/** Catppuccin Mocha — pastel on deep mauve. https://catppuccin.com */
const catppuccinMocha: ThemeSpec = {
  variant: 'dark',
  bg: ['#1e1e2e', '#181825', '#313244'],
  text: ['#cdd6f4', '#a6adc8', '#6c7086'],
  border: ['#313244', '#45475a', '#1e1e2e'],
  inverse: { bg: '#cba6f7', on: '#1e1e2e' },
  status: { info: '#89dceb', danger: '#f38ba8', success: '#a6e3a1', warning: '#f9e2af' },
  disabled: { bg: '#313244', text: '#6c7086' },
};

/** One Dark — Atom's classic. https://github.com/atom/one-dark-syntax */
const oneDark: ThemeSpec = {
  variant: 'dark',
  bg: ['#282c34', '#21252b', '#3a3f4b'],
  text: ['#abb2bf', '#8b93a1', '#5c6370'],
  border: ['#3a3f4b', '#4b5263', '#21252b'],
  inverse: { bg: '#61afef', on: '#282c34' },
  status: { info: '#56b6c2', danger: '#e06c75', success: '#98c379', warning: '#e5c07b' },
  disabled: { bg: '#3a3f4b', text: '#5c6370' },
};

/** Monokai — vivid on warm charcoal. https://monokai.pro */
const monokai: ThemeSpec = {
  variant: 'dark',
  bg: ['#272822', '#31322b', '#3e3d32'],
  text: ['#f8f8f2', '#cfcfc2', '#75715e'],
  border: ['#3e3d32', '#4d4b3d', '#272822'],
  inverse: { bg: '#a6e22e', on: '#272822' },
  status: { info: '#66d9ef', danger: '#f92672', success: '#a6e22e', warning: '#e6db74' },
  disabled: { bg: '#3e3d32', text: '#75715e' },
};

/** Solarized Dark — Ethan Schoonover's balanced palette. https://ethanschoonover.com/solarized */
const solarizedDark: ThemeSpec = {
  variant: 'dark',
  bg: ['#002b36', '#073642', '#0b4a5a'],
  text: ['#93a1a1', '#839496', '#657b83'],
  border: ['#0b4a5a', '#586e75', '#073642'],
  inverse: { bg: '#268bd2', on: '#002b36' },
  status: { info: '#2aa198', danger: '#dc322f', success: '#859900', warning: '#b58900' },
  disabled: { bg: '#0b4a5a', text: '#586e75' },
};

/** Solarized Light — the light half of the Solarized palette. */
const solarizedLight: ThemeSpec = {
  variant: 'light',
  bg: ['#fdf6e3', '#eee8d5', '#e4ddc8'],
  text: ['#586e75', '#657b83', '#93a1a1'],
  border: ['#eee8d5', '#ddd6c1', '#d3ccb8'],
  inverse: { bg: '#002b36', on: '#fdf6e3' },
  status: { info: '#268bd2', danger: '#dc322f', success: '#859900', warning: '#b58900' },
  disabled: { bg: '#e4ddc8', text: '#93a1a1' },
};

/** Rosé Pine — muted, soho-vibed. https://rosepinetheme.com */
const rosePine: ThemeSpec = {
  variant: 'dark',
  bg: ['#191724', '#1f1d2e', '#26233a'],
  text: ['#e0def4', '#908caa', '#6e6a86'],
  border: ['#26233a', '#403d52', '#1f1d2e'],
  inverse: { bg: '#c4a7e7', on: '#191724' },
  status: { info: '#9ccfd8', danger: '#eb6f92', success: '#31748f', warning: '#f6c177' },
  disabled: { bg: '#26233a', text: '#6e6a86' },
};

/** Theme ids for the bundled popular presets. */
export const POPULAR_THEME_IDS = [
  'nord',
  'dracula',
  'gruvbox-dark',
  'tokyo-night',
  'catppuccin-mocha',
  'one-dark',
  'monokai',
  'solarized-dark',
  'solarized-light',
  'rose-pine',
] as const;

export type PopularThemeId = (typeof POPULAR_THEME_IDS)[number];

/** Human-readable names; these are proper nouns and stay untranslated. */
export const POPULAR_THEME_LABELS: Record<PopularThemeId, string> = {
  nord: 'Nord',
  dracula: 'Dracula',
  'gruvbox-dark': 'Gruvbox Dark',
  'tokyo-night': 'Tokyo Night',
  'catppuccin-mocha': 'Catppuccin Mocha',
  'one-dark': 'One Dark',
  monokai: 'Monokai',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
  'rose-pine': 'Rosé Pine',
};

const specs: Record<PopularThemeId, ThemeSpec> = {
  nord,
  dracula,
  'gruvbox-dark': gruvboxDark,
  'tokyo-night': tokyoNight,
  'catppuccin-mocha': catppuccinMocha,
  'one-dark': oneDark,
  monokai,
  'solarized-dark': solarizedDark,
  'solarized-light': solarizedLight,
  'rose-pine': rosePine,
};

export const popularThemes: Record<PopularThemeId, ThemeDefinition> = Object.fromEntries(
  POPULAR_THEME_IDS.map((id) => [id, defineTheme(specs[id])])
) as Record<PopularThemeId, ThemeDefinition>;

/** Swatch colors (background + accent) used to preview a theme in pickers. */
export function themeSwatch(id: PopularThemeId): { background: string; accent: string } {
  const spec = specs[id];
  return { background: spec.bg[1], accent: spec.inverse.bg };
}
