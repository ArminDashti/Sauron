import { describe, it, expect } from 'vitest';
import { formatUserName, getUserInitials } from './userProfile';

describe('userProfile', () => {
  describe('formatUserName', () => {
    it('capitalizes a simple account name', () => {
      expect(formatUserName('armin')).toBe('Armin');
    });

    it('splits separators into words', () => {
      expect(formatUserName('armin.dashti')).toBe('Armin Dashti');
      expect(formatUserName('armin_dashti')).toBe('Armin Dashti');
      expect(formatUserName('armin-dashti')).toBe('Armin Dashti');
    });

    it('leaves existing capitalization alone', () => {
      expect(formatUserName('ArminD')).toBe('ArminD');
    });

    it('returns an empty string for an empty account name', () => {
      expect(formatUserName('')).toBe('');
    });
  });

  describe('getUserInitials', () => {
    it('uses the first letter of a single name', () => {
      expect(getUserInitials('Armin')).toBe('A');
    });

    it('uses the first letter of the first two words', () => {
      expect(getUserInitials('Armin Dashti')).toBe('AD');
    });

    it('returns an empty string for an empty name', () => {
      expect(getUserInitials('')).toBe('');
    });
  });
});
