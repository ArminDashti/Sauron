import { describe, expect, it } from 'vitest';
import {
  aggregateUsage,
  normalizeRange,
  rangeToEpochSeconds,
  toCount,
  toCost,
  UNKNOWN_KEY,
  type UsageRecord,
} from './usageStats';

const record = (overrides: Partial<UsageRecord>): UsageRecord => ({
  sessionId: null,
  model: null,
  provider: null,
  inputTokens: 0,
  inputCacheTokens: 0,
  writeTokens: 0,
  writeCacheTokens: 0,
  cost: null,
  ...overrides,
});

describe('normalizeRange', () => {
  it('keeps a chronological range', () => {
    expect(normalizeRange({ from: '2026-10-01', to: '2026-10-02' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-02',
    });
  });

  it('swaps a reversed range', () => {
    expect(normalizeRange({ from: '2026-10-05', to: '2026-10-01' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-05',
    });
  });

  it('rejects malformed input', () => {
    expect(normalizeRange({ from: 'yesterday', to: '2026-10-01' })).toBeNull();
    expect(normalizeRange(undefined)).toBeNull();
  });
});

describe('rangeToEpochSeconds', () => {
  it('includes the whole end day', () => {
    const bounds = rangeToEpochSeconds({ from: '2026-10-01', to: '2026-10-02' });
    expect(bounds).not.toBeNull();
    expect(bounds!.start).toBe(Math.floor(new Date(2026, 9, 1).getTime() / 1000));
    expect(bounds!.end).toBe(Math.floor(new Date(2026, 9, 3).getTime() / 1000));
    expect(bounds!.end).toBeGreaterThan(Math.floor(new Date(2026, 9, 2, 23, 59, 59).getTime() / 1000));
  });

  it('rejects impossible calendar dates', () => {
    expect(rangeToEpochSeconds({ from: '2026-02-31', to: '2026-03-01' })).toBeNull();
  });
});

describe('aggregateUsage', () => {
  const records: UsageRecord[] = [
    record({
      sessionId: 'a',
      model: 'm1',
      provider: 'p1',
      inputTokens: 100,
      inputCacheTokens: 60,
      writeTokens: 20,
      writeCacheTokens: 10,
      cost: 0.5,
    }),
    record({
      sessionId: 'a',
      model: 'm2',
      provider: 'p1',
      inputTokens: 50,
      writeTokens: 10,
      cost: null,
    }),
    record({
      sessionId: 'b',
      inputTokens: 7,
      writeTokens: 3,
      cost: 0.25,
    }),
  ];

  const result = aggregateUsage(records, { from: '2026-10-01', to: '2026-10-01' }, 'usage-ledger');

  it('groups by model and by provider', () => {
    expect(result.models.map((bucket) => bucket.key)).toEqual(['m1', 'm2', UNKNOWN_KEY]);
    expect(result.providers.map((bucket) => bucket.key)).toEqual(['p1', UNKNOWN_KEY]);
  });

  it('sums token columns', () => {
    expect(result.total).toMatchObject({
      inputTokens: 157,
      inputCacheTokens: 60,
      writeTokens: 33,
      writeCacheTokens: 10,
      requests: 3,
    });
  });

  it('adds only the costs that were reported', () => {
    expect(result.total.cost).toBeCloseTo(0.75);
    expect(result.providers.find((bucket) => bucket.key === 'p1')!.cost).toBeCloseTo(0.5);
    expect(result.models.find((bucket) => bucket.key === 'm2')!.cost).toBeNull();
  });

  it('counts distinct sessions and keeps the source', () => {
    expect(result.sessions).toBe(2);
    expect(result.source).toBe('usage-ledger');
    expect(result.error).toBeNull();
  });
});

describe('sql value coercion', () => {
  it('coerces counts', () => {
    expect(toCount(12)).toBe(12);
    expect(toCount('34')).toBe(34);
    expect(toCount(null)).toBe(0);
    expect(toCount(-5)).toBe(0);
  });

  it('keeps unknown costs unknown', () => {
    expect(toCost(1.5)).toBe(1.5);
    expect(toCost(null)).toBeNull();
    expect(toCost('nope')).toBeNull();
  });
});
