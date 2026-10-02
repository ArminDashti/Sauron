import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatClockDisplay, formatMessageTimestamp, formatRelativeTimestamp } from './timeUtils';

describe('timeUtils', () => {
  describe('formatClockDisplay', () => {
    it('formats 12-hour locale with AM/PM meridiem (en-US)', () => {
      // 8:49 PM
      const eveningDate = new Date(2026, 8, 1, 20, 49, 0);
      const eveningResult = formatClockDisplay(eveningDate, 'en-US');
      expect(eveningResult.time).toBe('8:49');
      expect(eveningResult.meridiem).toBe('PM');
      expect(eveningResult.hour).toBe(20);

      // 8:49 AM
      const morningDate = new Date(2026, 8, 1, 8, 49, 0);
      const morningResult = formatClockDisplay(morningDate, 'en-US');
      expect(morningResult.time).toBe('8:49');
      expect(morningResult.meridiem).toBe('AM');
      expect(morningResult.hour).toBe(8);

      // Midnight (12:00 AM)
      const midnight = new Date(2026, 8, 1, 0, 0, 0);
      const midnightResult = formatClockDisplay(midnight, 'en-US');
      expect(midnightResult.time).toBe('12:00');
      expect(midnightResult.meridiem).toBe('AM');
      expect(midnightResult.hour).toBe(0);

      // Noon (12:00 PM)
      const noon = new Date(2026, 8, 1, 12, 0, 0);
      const noonResult = formatClockDisplay(noon, 'en-US');
      expect(noonResult.time).toBe('12:00');
      expect(noonResult.meridiem).toBe('PM');
      expect(noonResult.hour).toBe(12);
    });

    it('formats 24-hour locale without meridiem (en-GB)', () => {
      const eveningDate = new Date(2026, 8, 1, 20, 49, 0);
      const result = formatClockDisplay(eveningDate, 'en-GB');
      expect(result.time).toBe('20:49');
      expect(result.meridiem).toBe('');
      expect(result.hour).toBe(20);

      const midnight = new Date(2026, 8, 1, 0, 5, 0);
      const midnightResult = formatClockDisplay(midnight, 'en-GB');
      expect(midnightResult.time).toBe('0:05');
      expect(midnightResult.meridiem).toBe('');
      expect(midnightResult.hour).toBe(0);
    });

    it('formats 24-hour European locales without meridiem (de-DE, sv-SE, fr-FR)', () => {
      const eveningDate = new Date(2026, 8, 1, 20, 49, 0);

      const deResult = formatClockDisplay(eveningDate, 'de-DE');
      expect(deResult.time).toBe('20:49');
      expect(deResult.meridiem).toBe('');

      const svResult = formatClockDisplay(eveningDate, 'sv-SE');
      expect(svResult.time).toBe('20:49');
      expect(svResult.meridiem).toBe('');

      const frResult = formatClockDisplay(eveningDate, 'fr-FR');
      expect(frResult.time).toBe('20:49');
      expect(frResult.meridiem).toBe('');
    });

    it('defaults to current date when no date is supplied', () => {
      const result = formatClockDisplay();
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('meridiem');
      expect(result).toHaveProperty('hour');
      expect(typeof result.time).toBe('string');
      expect(typeof result.hour).toBe('number');
    });

    it('handles unexpected/invalid locale gracefully using fallback', () => {
      const eveningDate = new Date(2026, 8, 1, 20, 49, 0);
      const result = formatClockDisplay(eveningDate, 'invalid-locale-!!!');
      expect(result.time).toBe('8:49');
      expect(result.meridiem).toBe('PM');
      expect(result.hour).toBe(20);
    });
  });

  describe('formatMessageTimestamp', () => {
    it('formats timestamp from today with time only', () => {
      const now = new Date();
      const timestamp = Math.floor(now.getTime() / 1000);
      const result = formatMessageTimestamp(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats timestamp from previous date with date and time', () => {
      const pastDate = new Date(2025, 0, 1, 12, 0, 0);
      const timestamp = Math.floor(pastDate.getTime() / 1000);
      const result = formatMessageTimestamp(timestamp);
      expect(result).toContain('2025');
    });
  });

  describe('formatRelativeTimestamp', () => {
    const NOW = new Date('2026-01-10T12:00:00Z');
    const secondsAgo = (seconds: number) => Math.floor(NOW.getTime() / 1000) - seconds;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns an empty string when the timestamp is missing or invalid', () => {
      expect(formatRelativeTimestamp(undefined)).toBe('');
      expect(formatRelativeTimestamp(0)).toBe('');
      expect(formatRelativeTimestamp(Number.NaN)).toBe('');
    });

    it('returns "now" for timestamps under a minute (and clamps future ones)', () => {
      expect(formatRelativeTimestamp(secondsAgo(5))).toBe('now');
      expect(formatRelativeTimestamp(secondsAgo(-60))).toBe('now');
    });

    it('returns minutes for the first hour', () => {
      expect(formatRelativeTimestamp(secondsAgo(60))).toBe('1m');
      expect(formatRelativeTimestamp(secondsAgo(7 * 60))).toBe('7m');
      expect(formatRelativeTimestamp(secondsAgo(59 * 60 + 59))).toBe('59m');
    });

    it('returns hours for the first day', () => {
      expect(formatRelativeTimestamp(secondsAgo(60 * 60))).toBe('1h');
      expect(formatRelativeTimestamp(secondsAgo(10 * 60 * 60))).toBe('10h');
      expect(formatRelativeTimestamp(secondsAgo(23 * 60 * 60))).toBe('23h');
    });

    it('returns days up to a year, then years', () => {
      expect(formatRelativeTimestamp(secondsAgo(24 * 60 * 60))).toBe('1d');
      expect(formatRelativeTimestamp(secondsAgo(23 * 24 * 60 * 60))).toBe('23d');
      expect(formatRelativeTimestamp(secondsAgo(400 * 24 * 60 * 60))).toBe('1y');
    });
  });
});
