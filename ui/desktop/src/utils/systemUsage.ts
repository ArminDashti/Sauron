import os from 'node:os';

/** System resource usage as whole-number percentages (0-100). */
export interface SystemUsage {
  cpuPercent: number;
  memoryPercent: number;
}

/** Aggregated CPU time counters across all cores. */
export interface CpuSample {
  idle: number;
  total: number;
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

let previousCpuSample = sampleCpuTimes();

/**
 * Returns system CPU usage since the previous call plus current memory usage.
 * The renderer polls this periodically, so each call advances the CPU baseline.
 */
export const getSystemUsage = (): SystemUsage => {
  const currentCpuSample = sampleCpuTimes();
  const usage: SystemUsage = {
    cpuPercent: computeCpuPercent(previousCpuSample, currentCpuSample),
    memoryPercent: computeMemoryPercent(os.totalmem(), os.freemem()),
  };
  previousCpuSample = currentCpuSample;
  return usage;
};
