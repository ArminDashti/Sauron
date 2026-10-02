import type {
  UsageStatsBucket,
  UsageStatsRange,
  UsageStatsResult,
  UsageStatsSource,
} from '../types/usageStats';

/** Label used when a record carries no model/provider name. */
export const UNKNOWN_KEY = 'unknown';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A single recorded inference call, already flattened across sources. */
export type UsageRecord = {
  sessionId: string | null;
  model: string | null;
  provider: string | null;
  inputTokens: number;
  inputCacheTokens: number;
  writeTokens: number;
  writeCacheTokens: number;
  cost: number | null;
};

/** `2026-10-02` for the given date, matching what `<input type="date">` emits. */
export function toDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Normalizes a range: valid dates only, with `from` never after `to`. */
export function normalizeRange(range: UsageStatsRange | undefined | null): UsageStatsRange | null {
  if (!range) {
    return null;
  }
  const from = typeof range.from === 'string' ? range.from.trim() : '';
  const to = typeof range.to === 'string' ? range.to.trim() : '';
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return null;
  }
  return from <= to ? { from, to } : { from: to, to: from };
}

/**
 * Local-midnight epoch seconds for the range, with `end` exclusive so the
 * whole `to` day is included.
 */
export function rangeToEpochSeconds(
  range: UsageStatsRange
): { start: number; end: number } | null {
  const start = localMidnight(range.from);
  const lastDay = localMidnight(range.to);
  if (start === null || lastDay === null) {
    return null;
  }
  // One day is 86400s except across a DST change, so re-derive it from a Date.
  const nextDay = new Date(lastDay * 1000);
  nextDay.setDate(nextDay.getDate() + 1);
  return { start, end: Math.floor(nextDay.getTime() / 1000) };
}

/** Epoch seconds of local midnight for `YYYY-MM-DD`, or `null` if not a real date. */
function localMidnight(value: string): number | null {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return Math.floor(parsed.getTime() / 1000);
}

export function emptyResult(
  range: UsageStatsRange,
  source: UsageStatsSource,
  error: string | null
): UsageStatsResult {
  return {
    range,
    models: [],
    providers: [],
    total: emptyBucket(''),
    sessions: 0,
    source,
    error,
  };
}

function emptyBucket(key: string): UsageStatsBucket {
  return {
    key,
    inputTokens: 0,
    inputCacheTokens: 0,
    writeTokens: 0,
    writeCacheTokens: 0,
    cost: null,
    requests: 0,
  };
}

function addTo(target: UsageStatsBucket, record: UsageRecord): void {
  target.inputTokens += record.inputTokens;
  target.inputCacheTokens += record.inputCacheTokens;
  target.writeTokens += record.writeTokens;
  target.writeCacheTokens += record.writeCacheTokens;
  target.requests += 1;
  if (record.cost !== null) {
    target.cost = (target.cost ?? 0) + record.cost;
  }
}

function byWeight(a: UsageStatsBucket, b: UsageStatsBucket): number {
  const weight = (bucket: UsageStatsBucket) =>
    bucket.inputTokens + bucket.inputCacheTokens + bucket.writeTokens + bucket.writeCacheTokens;
  return weight(b) - weight(a) || a.key.localeCompare(b.key);
}

function groupBy(records: UsageRecord[], keyOf: (record: UsageRecord) => string): UsageStatsBucket[] {
  const buckets = new Map<string, UsageStatsBucket>();
  for (const record of records) {
    const key = keyOf(record) || UNKNOWN_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = emptyBucket(key);
      buckets.set(key, bucket);
    }
    addTo(bucket, record);
  }
  return [...buckets.values()].sort(byWeight);
}

/** Folds flattened usage records into the per-model / per-provider tables. */
export function aggregateUsage(
  records: UsageRecord[],
  range: UsageStatsRange,
  source: UsageStatsSource
): UsageStatsResult {
  const sessions = new Set<string>();
  for (const record of records) {
    if (record.sessionId) {
      sessions.add(record.sessionId);
    }
  }

  const total = emptyBucket('');
  for (const record of records) {
    addTo(total, record);
  }

  return {
    range,
    models: groupBy(records, (record) => record.model ?? ''),
    providers: groupBy(records, (record) => record.provider ?? ''),
    total,
    sessions: sessions.size,
    source,
    error: null,
  };
}

/** Non-negative integer out of a possibly `null` SQL aggregate. */
export function toCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

/** Cost out of a possibly `null` SQL aggregate; `null` stays "unknown". */
export function toCost(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
