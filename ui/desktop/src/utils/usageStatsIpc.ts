import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ipcMain } from 'electron';
import type { UsageStatsRange, UsageStatsResult } from '../types/usageStats';
import {
  aggregateUsage,
  emptyResult,
  normalizeRange,
  rangeToEpochSeconds,
  toCount,
  toCost,
  type UsageRecord,
} from './usageStats';

type SqliteRow = Record<string, unknown>;

/**
 * Locates `sessions.db` the same way goose's `Paths` does: `GOOSE_PATH_ROOT`
 * when set, otherwise `<vendor>/<app>/data/sessions`. Both `data/` layouts and
 * the flat one are probed, and sibling app directories are scanned so a
 * rebranded data directory is still found.
 */
export function findSessionDbPath(): string | null {
  const relative = path.join('sessions', 'sessions.db');

  const root = process.env.GOOSE_PATH_ROOT;
  if (root && path.isAbsolute(root)) {
    return firstExisting([path.join(root, 'data', relative), path.join(root, relative)]);
  }

  const vendorDirs: string[] = [];
  if (process.platform === 'win32') {
    if (process.env.APPDATA) {
      vendorDirs.push(path.join(process.env.APPDATA, 'Block'));
    }
  } else if (process.platform === 'darwin') {
    vendorDirs.push(path.join(os.homedir(), 'Library', 'Application Support', 'Block'));
  } else {
    vendorDirs.push(
      path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'Block')
    );
  }

  const candidates: string[] = [];
  for (const vendorDir of vendorDirs) {
    for (const appDir of listAppDirs(vendorDir)) {
      candidates.push(path.join(appDir, 'data', relative), path.join(appDir, relative));
    }
  }
  return firstExisting(candidates);
}

function listAppDirs(vendorDir: string): string[] {
  try {
    return fs
      .readdirSync(vendorDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      // Prefer the canonical goose directory over any sibling.
      .sort((a, b) => Number(b === 'goose') - Number(a === 'goose') || a.localeCompare(b))
      .map((name) => path.join(vendorDir, name));
  } catch {
    return [];
  }
}

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

type SqliteDatabase = import('node:sqlite').DatabaseSync;

function openReadOnly(dbPath: string): SqliteDatabase {
  // Resolved at runtime so an Electron without `node:sqlite` surfaces an error
  // message instead of taking the whole main process down at import time.
  const sqlite = process.getBuiltinModule('node:sqlite') as
    | { DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => SqliteDatabase }
    | undefined;
  if (!sqlite) {
    throw new Error('This Electron build does not provide the node:sqlite module.');
  }
  return new sqlite.DatabaseSync(dbPath, { readOnly: true });
}

async function readLedgerRecords(
  dbPath: string,
  start: number,
  end: number
): Promise<UsageRecord[]> {
  const db = openReadOnly(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT l.model AS model,
                s.provider_name AS provider,
                l.session_id AS session_id,
                l.input_tokens AS input_tokens,
                l.cache_read_tokens AS cache_read_tokens,
                l.output_tokens AS output_tokens,
                l.cache_write_tokens AS cache_write_tokens,
                l.cost AS cost
           FROM usage_ledger l
           LEFT JOIN sessions s ON s.id = l.session_id
          WHERE l.created_timestamp >= ? AND l.created_timestamp < ?`
      )
      .all(start, end) as SqliteRow[];

    return rows.map((row) => ({
      sessionId: typeof row.session_id === 'string' ? row.session_id : null,
      model: typeof row.model === 'string' && row.model ? row.model : null,
      provider: typeof row.provider === 'string' && row.provider ? row.provider : null,
      inputTokens: toCount(row.input_tokens),
      inputCacheTokens: toCount(row.cache_read_tokens),
      writeTokens: toCount(row.output_tokens),
      writeCacheTokens: toCount(row.cache_write_tokens),
      cost: toCost(row.cost),
    }));
  } finally {
    db.close();
  }
}

/**
 * Fallback for builds that predate `usage_ledger`: usage stored on the message
 * itself, with the model/provider from the inference metadata of that message.
 */
async function readMessageRecords(
  dbPath: string,
  start: number,
  end: number
): Promise<UsageRecord[]> {
  const db = openReadOnly(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT m.session_id AS session_id,
                m.metadata_json AS metadata_json,
                s.provider_name AS provider
           FROM messages m
           LEFT JOIN sessions s ON s.id = m.session_id
          WHERE m.created_timestamp >= ? AND m.created_timestamp < ?`
      )
      .all(start, end) as SqliteRow[];

    const records: UsageRecord[] = [];
    for (const row of rows) {
      const metadata = parseJson(row.metadata_json);
      if (!metadata || !isRecord(metadata.usage)) {
        continue;
      }
      const usage = metadata.usage;
      const inference = isRecord(metadata.inference) ? metadata.inference : null;
      records.push({
        sessionId: typeof row.session_id === 'string' ? row.session_id : null,
        model: stringValue(inference?.resolvedModel) ?? stringValue(inference?.requestedModel),
        provider:
          stringValue(inference?.provider) ??
          (typeof row.provider === 'string' && row.provider ? row.provider : null),
        inputTokens: toCount(usage.inputTokens),
        inputCacheTokens: toCount(usage.cacheReadTokens),
        writeTokens: toCount(usage.outputTokens),
        writeCacheTokens: toCount(usage.cacheWriteTokens),
        cost: toCost(usage.cost),
      });
    }
    return records;
  } finally {
    db.close();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Reads aggregated usage for the range, falling back to message metadata. */
export async function loadUsageStats(
  range: UsageStatsRange | null | undefined
): Promise<UsageStatsResult> {
  const requested: UsageStatsRange = {
    from: typeof range?.from === 'string' ? range.from : '',
    to: typeof range?.to === 'string' ? range.to : '',
  };
  const normalized = normalizeRange(requested);
  if (!normalized) {
    return emptyResult(requested, 'none', `Invalid date range: ${requested.from} → ${requested.to}`);
  }

  const bounds = rangeToEpochSeconds(normalized);
  const dbPath = findSessionDbPath();
  if (!bounds) {
    return emptyResult(normalized, 'none', `Invalid date range: ${normalized.from}`);
  }
  if (!dbPath) {
    return emptyResult(normalized, 'none', 'No session database found yet.');
  }

  try {
    const ledgerRecords = await readLedgerRecords(dbPath, bounds.start, bounds.end);
    if (ledgerRecords.length > 0) {
      return aggregateUsage(ledgerRecords, normalized, 'usage-ledger');
    }

    const messageRecords = await readMessageRecords(dbPath, bounds.start, bounds.end);
    if (messageRecords.length > 0) {
      return aggregateUsage(messageRecords, normalized, 'message-metadata');
    }

    return emptyResult(normalized, 'none', null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return emptyResult(normalized, 'none', `Could not read usage stats: ${message}`);
  }
}

ipcMain.handle('get-usage-stats', (_event, range: UsageStatsRange) => loadUsageStats(range));
