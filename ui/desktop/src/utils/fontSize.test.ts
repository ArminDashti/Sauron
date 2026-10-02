import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyFontSize,
  clampFontSize,
  isValidFontSizeSetting,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_STEP,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from './fontSize';

describe('clampFontSize', () => {
  it('keeps values inside the allowed range', () => {
    expect(clampFontSize(DEFAULT_FONT_SIZE)).toBe(DEFAULT_FONT_SIZE);
    expect(clampFontSize(130)).toBe(130);
  });

  it('clamps values outside the allowed range', () => {
    expect(clampFontSize(MIN_FONT_SIZE - 40)).toBe(MIN_FONT_SIZE);
    expect(clampFontSize(MAX_FONT_SIZE + 100)).toBe(MAX_FONT_SIZE);
  });

  it('rounds to a whole percentage', () => {
    expect(clampFontSize(110.4)).toBe(110);
    expect(clampFontSize(110.6)).toBe(111);
  });

  it('falls back to the default for non-finite values', () => {
    expect(clampFontSize(NaN)).toBe(DEFAULT_FONT_SIZE);
    expect(clampFontSize(Infinity)).toBe(DEFAULT_FONT_SIZE);
  });
});

describe('isValidFontSizeSetting', () => {
  it('accepts values inside the allowed range', () => {
    expect(isValidFontSizeSetting(MIN_FONT_SIZE)).toBe(true);
    expect(isValidFontSizeSetting(DEFAULT_FONT_SIZE)).toBe(true);
    expect(isValidFontSizeSetting(MAX_FONT_SIZE)).toBe(true);
  });

  it('rejects out-of-range and non-numeric values', () => {
    expect(isValidFontSizeSetting(MIN_FONT_SIZE - 1)).toBe(false);
    expect(isValidFontSizeSetting(MAX_FONT_SIZE + 1)).toBe(false);
    expect(isValidFontSizeSetting(NaN)).toBe(false);
    expect(isValidFontSizeSetting('100')).toBe(false);
    expect(isValidFontSizeSetting(null)).toBe(false);
  });
});

describe('applyFontSize', () => {
  beforeEach(() => {
    document.documentElement.style.fontSize = '';
  });

  it('scales the root font size from the 16px base', () => {
    applyFontSize(DEFAULT_FONT_SIZE);
    expect(document.documentElement.style.fontSize).toBe('16px');

    applyFontSize(125);
    expect(document.documentElement.style.fontSize).toBe('20px');
  });

  it('clamps out-of-range values before applying', () => {
    applyFontSize(MAX_FONT_SIZE);
    expect(document.documentElement.style.fontSize).toBe('25.6px');
  });
});

describe('FONT_SIZE_STEP', () => {
  it('stays within the allowed range when applied from the default', () => {
    const minSteps = (DEFAULT_FONT_SIZE - MIN_FONT_SIZE) / FONT_SIZE_STEP;
    const maxSteps = (MAX_FONT_SIZE - DEFAULT_FONT_SIZE) / FONT_SIZE_STEP;
    expect(Number.isInteger(minSteps)).toBe(true);
    expect(Number.isInteger(maxSteps)).toBe(true);
  });
});
