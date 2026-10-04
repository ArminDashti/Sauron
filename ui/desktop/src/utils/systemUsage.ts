import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';

/** System resource usage as whole-number percentages and whole-Mbps throughput. */
export interface SystemUsage {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  downloadMbps: number;
  uploadMbps: number;
}

/** Aggregated CPU time counters across all cores. */
export interface CpuSample {
  idle: number;
  total: number;
}

/** Cumulative bytes received and sent by the host's network interfaces. */
export interface ByteCounters {
  received: number;
  sent: number;
}

/** Download and upload throughput in whole megabits per second. */
export interface Throughput {
  downloadMbps: number;
  uploadMbps: number;
}

/** Snapshots the current CPU time counters summed over every core. */
export const sampleCpuTimes = (): CpuSample => {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
};

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

/** CPU busy percentage between two samples, clamped to 0-100. */
export const computeCpuPercent = (previous: CpuSample, current: CpuSample): number => {
  const totalDelta = current.total - previous.total;
  const idleDelta = current.idle - previous.idle;
  if (totalDelta <= 0) return 0;
  return clampPercent(((totalDelta - idleDelta) / totalDelta) * 100);
};

/** Used-memory percentage for the given total/free byte counts. */
export const computeMemoryPercent = (totalMemory: number, freeMemory: number): number => {
  if (totalMemory <= 0) return 0;
  return clampPercent(((totalMemory - freeMemory) / totalMemory) * 100);
};

/** Used-space percentage of a filesystem, clamped to 0-100. */
export const computeDiskPercent = (blocks: number, freeBlocks: number): number => {
  if (blocks <= 0) return 0;
  return clampPercent(((blocks - freeBlocks) / blocks) * 100);
};

/** Throughput in whole Mbps for the byte counters exchanged over an interval. */
export const computeThroughputMbps = (
  previous: ByteCounters,
  current: ByteCounters,
  elapsedMs: number
): Throughput => {
  if (elapsedMs <= 0) return { downloadMbps: 0, uploadMbps: 0 };
  const mbps = (bytes: number): number => {
    if (bytes <= 0) return 0;
    return Math.round((bytes * 8) / (elapsedMs / 1000) / 1_000_000);
  };
  return {
    downloadMbps: mbps(current.received - previous.received),
    uploadMbps: mbps(current.sent - previous.sent),
  };
};

const COUNTERS_DELIMITER = '|';

/** Sums `Get-NetAdapterStatistics` rows of "name|received|sent" byte counters. */
export const parseWindowsCounters = (output: string): ByteCounters | null => {
  let received = 0;
  let sent = 0;
  let found = false;
  for (const line of output.split('\n')) {
    const [name, receivedBytes, sentBytes] = line.trim().split(COUNTERS_DELIMITER);
    if (!name || receivedBytes === undefined || sentBytes === undefined) continue;
    if (name.toLowerCase().includes('loopback')) continue;
    received += Number(receivedBytes) || 0;
    sent += Number(sentBytes) || 0;
    found = true;
  }
  return found ? { received, sent } : null;
};

/** Sums the non-loopback interface counters in /proc/net/dev. */
export const parseProcNetDev = (contents: string): ByteCounters | null => {
  let received = 0;
  let sent = 0;
  let found = false;
  for (const line of contents.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    if (!name || name === 'lo') continue;
    const fields = line.slice(separator + 1).trim().split(/\s+/);
    if (fields.length < 9) continue;
    received += Number(fields[0]) || 0;
    sent += Number(fields[8]) || 0;
    found = true;
  }
  return found ? { received, sent } : null;
};

/** Sums the non-loopback Ibytes/Obytes columns of `netstat -ib`, once per interface. */
export const parseNetstatIb = (output: string): ByteCounters | null => {
  const [header, ...rows] = output.split('\n').filter((line) => line.trim());
  if (!header) return null;
  const columns = header.trim().split(/\s+/);
  if (!columns.includes('Ibytes') || !columns.includes('Obytes')) return null;

  const counted = new Set<string>();
  let received = 0;
  let sent = 0;
  for (const row of rows) {
    const fields = row.trim().split(/\s+/);
    const [name] = fields;
    if (!name || name.startsWith('lo') || counted.has(name)) continue;
    // Interfaces without an address omit that column, so the byte counters are
    // read from the end of the row (… Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll).
    const rowReceived = Number(fields[fields.length - 5]);
    const rowSent = Number(fields[fields.length - 2]);
    if (!Number.isFinite(rowReceived) || !Number.isFinite(rowSent)) continue;
    counted.add(name);
    received += rowReceived;
    sent += rowSent;
  }
  return counted.size > 0 ? { received, sent } : null;
};

const NETWORK_READ_TIMEOUT_MS = 2000;

const WINDOWS_COUNTERS_COMMAND =
  'Get-NetAdapterStatistics -ErrorAction SilentlyContinue | ForEach-Object { "$($_.Name)|$($_.ReceivedBytes)|$($_.SentBytes)" }';

const runCommand = (file: string, args: string[]): Promise<string> =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      { windowsHide: true, timeout: NETWORK_READ_TIMEOUT_MS },
      (_error, stdout) => resolve(stdout)
    );
  });

const readByteCounters = async (): Promise<ByteCounters | null> => {
  try {
    if (process.platform === 'win32') {
      return parseWindowsCounters(
        await runCommand('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          WINDOWS_COUNTERS_COMMAND,
        ])
      );
    }
    if (process.platform === 'darwin') {
      return parseNetstatIb(await runCommand('netstat', ['-ib']));
    }
    if (process.platform === 'linux') {
      return parseProcNetDev(await fs.readFile('/proc/net/dev', 'utf8'));
    }
    return null;
  } catch {
    return null;
  }
};

const SYSTEM_DRIVE_PATH =
  process.platform === 'win32' ? `${process.env.SystemDrive ?? 'C:'}\\` : '/';

const readDiskPercent = async (): Promise<number> => {
  try {
    const { blocks, bfree } = await fs.statfs(SYSTEM_DRIVE_PATH);
    return computeDiskPercent(blocks, bfree);
  } catch {
    return 0;
  }
};

let previousCpuSample = sampleCpuTimes();
let previousCounters: ByteCounters | null = null;
let previousCountersAt = 0;
let countersRead: Promise<ByteCounters | null> | null = null;
let lastThroughput: Throughput = { downloadMbps: 0, uploadMbps: 0 };

const readThroughput = async (): Promise<Throughput> => {
  countersRead ??= readByteCounters().finally(() => {
    countersRead = null;
  });
  const counters = await countersRead;
  if (!counters) return lastThroughput;

  const now = Date.now();
  lastThroughput = previousCounters
    ? computeThroughputMbps(previousCounters, counters, now - previousCountersAt)
    : { downloadMbps: 0, uploadMbps: 0 };
  previousCounters = counters;
  previousCountersAt = now;
  return lastThroughput;
};

/**
 * Returns system CPU, memory, disk and network usage. The renderer polls this
 * periodically, so each call advances the CPU and network byte baselines.
 */
export const getSystemUsage = async (): Promise<SystemUsage> => {
  const currentCpuSample = sampleCpuTimes();
  const [diskPercent, throughput] = await Promise.all([readDiskPercent(), readThroughput()]);
  const usage: SystemUsage = {
    cpuPercent: computeCpuPercent(previousCpuSample, currentCpuSample),
    memoryPercent: computeMemoryPercent(os.totalmem(), os.freemem()),
    diskPercent,
    downloadMbps: throughput.downloadMbps,
    uploadMbps: throughput.uploadMbps,
  };
  previousCpuSample = currentCpuSample;
  return usage;
};
