import { describe, it, expect } from 'vitest';
import { computeCpuPercent, computeMemoryPercent, getSystemUsage } from './systemUsage';

describe('computeCpuPercent', () => {
  it('computes busy time as a percentage of total time between samples', () => {
    const previous = { idle: 100, total: 500 };
    const current = { idle: 150, total: 700 };
    // 50 idle of 200 total delta -> 75% busy
    expect(computeCpuPercent(previous, current)).toBe(75);
  });

  it('returns 0 when no time has elapsed between samples', () => {
    expect(computeCpuPercent({ idle: 100, total: 500 }, { idle: 100, total: 500 })).toBe(0);
  });

  it('clamps results into the 0-100 range', () => {
    // Idle time decreasing across samples would exceed 100% without clamping.
    expect(computeCpuPercent({ idle: 500, total: 500 }, { idle: 450, total: 550 })).toBe(100);
    // More idle than total delta would go negative without clamping.
    expect(computeCpuPercent({ idle: 100, total: 500 }, { idle: 650, total: 600 })).toBe(0);
  });
});

describe('computeMemoryPercent', () => {
  it('reports used memory as a percentage of total memory', () => {
    expect(computeMemoryPercent(1000, 250)).toBe(75);
  });

  it('returns 0 for a non-positive total', () => {
    expect(computeMemoryPercent(0, 0)).toBe(0);
  });

  it('rounds to a whole percent', () => {
    expect(computeMemoryPercent(300, 199)).toBe(34);
  });
});

describe('getSystemUsage', () => {
  it('returns clamped percentages for the current system', () => {
    const usage = getSystemUsage();
    expect(usage.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(usage.cpuPercent).toBeLessThanOrEqual(100);
    expect(usage.memoryPercent).toBeGreaterThanOrEqual(0);
    expect(usage.memoryPercent).toBeLessThanOrEqual(100);
    expect(Number.isInteger(usage.cpuPercent)).toBe(true);
    expect(Number.isInteger(usage.memoryPercent)).toBe(true);
  });
});
