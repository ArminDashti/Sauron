/**
 * User-authored theme.
 *
 * A custom theme is a name plus a sparse map of color token overrides layered
 * on top of a light or dark base, so untouched tokens keep following the base
 * palette. `customThemeColorSlots` is the editor's contract: every slot writes
 * all of its tokens together, which keeps a semantic color (info, danger, …)
 * consistent across backgrounds, borders, text and rings.
 */
import { defineMessages, type MessageDescriptor } from 'react-intl';
import type { ColorTokenKey, ThemeVariant } from './theme-base';

export interface CustomTheme {
  name: string;
  variant: ThemeVariant;
  colors: Partial<Record<ColorTokenKey, string>>;
}

export const DEFAULT_CUSTOM_THEME_NAME = 'My theme';

export const defaultCustomTheme: CustomTheme = {
  name: DEFAULT_CUSTOM_THEME_NAME,
  variant: 'dark',
  colors: {},
};

export interface CustomThemeColorSlot {
  id: string;
  tokens: ColorTokenKey[];
  label: MessageDescriptor;
}

const i18n = defineMessages({
  background: { id: 'customTheme.slotBackground', defaultMessage: 'Background' },
  surface: { id: 'customTheme.slotSurface', defaultMessage: 'Surface' },
  elevated: { id: 'customTheme.slotElevated', defaultMessage: 'Elevated surface' },
  text: { id: 'customTheme.slotText', defaultMessage: 'Text' },
  mutedText: { id: 'customTheme.slotMutedText', defaultMessage: 'Muted text' },
  border: { id: 'customTheme.slotBorder', defaultMessage: 'Border' },
  strongBorder: { id: 'customTheme.slotStrongBorder', defaultMessage: 'Strong border' },
  accent: { id: 'customTheme.slotAccent', defaultMessage: 'Accent' },
  accentText: { id: 'customTheme.slotAccentText', defaultMessage: 'Text on accent' },
  info: { id: 'customTheme.slotInfo', defaultMessage: 'Info' },
  success: { id: 'customTheme.slotSuccess', defaultMessage: 'Success' },
  warning: { id: 'customTheme.slotWarning', defaultMessage: 'Warning' },
  danger: { id: 'customTheme.slotDanger', defaultMessage: 'Danger' },
});

const statusTokens = (status: 'info' | 'success' | 'warning' | 'danger'): ColorTokenKey[] => [
  `--color-background-${status}`,
  `--color-text-${status}`,
  `--color-border-${status}`,
  `--color-ring-${status}`,
];

export const customThemeColorSlots: CustomThemeColorSlot[] = [
  { id: 'background', tokens: ['--color-background-primary'], label: i18n.background },
  { id: 'surface', tokens: ['--color-background-secondary'], label: i18n.surface },
  { id: 'elevated', tokens: ['--color-background-tertiary'], label: i18n.elevated },
  { id: 'text', tokens: ['--color-text-primary'], label: i18n.text },
  {
    id: 'mutedText',
    tokens: ['--color-text-secondary', '--color-text-ghost'],
    label: i18n.mutedText,
  },
  {
    id: 'border',
    tokens: ['--color-border-primary', '--color-ring-primary'],
    label: i18n.border,
  },
  { id: 'strongBorder', tokens: ['--color-border-secondary'], label: i18n.strongBorder },
  { id: 'accent', tokens: ['--color-background-inverse'], label: i18n.accent },
  { id: 'accentText', tokens: ['--color-text-inverse'], label: i18n.accentText },
  { id: 'info', tokens: statusTokens('info'), label: i18n.info },
  { id: 'success', tokens: statusTokens('success'), label: i18n.success },
  { id: 'warning', tokens: statusTokens('warning'), label: i18n.warning },
  { id: 'danger', tokens: statusTokens('danger'), label: i18n.danger },
];

/** Color currently shown for a slot, taken from its first token. */
export function slotColor(
  colors: CustomTheme['colors'],
  slot: CustomThemeColorSlot
): string | undefined {
  return colors[slot.tokens[0]];
}

/** Writes (or clears, for an empty value) every token a slot owns. */
export function withSlotColor(
  colors: CustomTheme['colors'],
  slot: CustomThemeColorSlot,
  value: string
): CustomTheme['colors'] {
  const next = { ...colors };
  for (const token of slot.tokens) {
    if (value) {
      next[token] = value;
    } else {
      delete next[token];
    }
  }
  return next;
}

/** Accepts anything persisted in settings and returns a usable custom theme. */
export function normalizeCustomTheme(value: unknown): CustomTheme {
  if (!value || typeof value !== 'object') return defaultCustomTheme;

  const candidate = value as Partial<CustomTheme>;
  const colors: CustomTheme['colors'] = {};
  if (candidate.colors && typeof candidate.colors === 'object') {
    for (const [token, color] of Object.entries(candidate.colors)) {
      if (typeof color === 'string' && color) {
        colors[token as ColorTokenKey] = color;
      }
    }
  }

  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  return {
    name: name || DEFAULT_CUSTOM_THEME_NAME,
    variant: candidate.variant === 'light' ? 'light' : 'dark',
    colors,
  };
}
