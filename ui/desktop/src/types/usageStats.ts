/** Inclusive local-time date bounds for a usage stats query, as `YYYY-MM-DD`. */
export type UsageStatsRange = {
  from: string;
  to: string;
};

/**
 * One aggregated row of the stats table — keyed by model in `models` and by
 * provider in `providers`.
 */
export type UsageStatsBucket = {
  key: string;
  inputTokens: number;
  /** Cache-read input tokens; a subset of `inputTokens`. */
  inputCacheTokens: number;
  writeTokens: number;
  /** Tokens written to the prompt cache; a subset of `inputTokens`. */
  writeCacheTokens: number;
  /** Summed USD cost, or `null` when nothing in the bucket reported one. */
  cost: number | null;
  requests: number;
};

/**
 * Where the numbers came from. Goose records per-call rows in `usage_ledger`;
 * builds that predate it only carry usage on the stored messages, which is the
 * fallback source.
 */
export type UsageStatsSource = 'usage-ledger' | 'message-metadata' | 'none';

export type UsageStatsResult = {
  range: UsageStatsRange;
  models: UsageStatsBucket[];
  providers: UsageStatsBucket[];
  total: UsageStatsBucket;
  /** Sessions that contributed at least one record in the range. */
  sessions: number;
  source: UsageStatsSource;
  /** Set when stats could not be read; the buckets are then empty. */
  error: string | null;
};
