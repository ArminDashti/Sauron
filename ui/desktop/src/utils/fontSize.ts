/**
 * User-facing font size preference, stored as a percentage of the default
 * 16px root font size. The value is applied to `document.documentElement`
 * so every rem-based size in the UI (text, spacing) scales together.
 */

/** Applied when no valid preference has been saved yet. */
export const DEFAULT_FONT_SIZE = 100;
/** Smallest allowed percentage. */
export const MIN_FONT_SIZE = 80;
/** Largest allowed percentage. */
export const MAX_FONT_SIZE = 160;
/** Increment used by the increase/decrease controls. */
export const FONT_SIZE_STEP = 10;

const BASE_FONT_SIZE_PX = 16;

/** Clamp a value to the allowed font size range. Non-finite input falls back to the default. */
export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE;
  }
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
}

/** Runtime guard for a persisted font size setting. */
export function isValidFontSizeSetting(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_FONT_SIZE &&
    value <= MAX_FONT_SIZE
  );
}

/** Set the root font size so rem-based typography follows the preference. */
export function applyFontSize(value: number): void {
  const percent = clampFontSize(value);
  document.documentElement.style.fontSize = `${(BASE_FONT_SIZE_PX * percent) / 100}px`;
}
