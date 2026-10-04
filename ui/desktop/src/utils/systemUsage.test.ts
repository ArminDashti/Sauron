import { describe, it, expect } from 'vitest';
import {
  computeCpuPercent,
  computeDiskPercent,
  computeMemoryPercent,
  computeThroughputMbps,
  getSystemUsage,
  parseNetstatIb,
  parseProcNetDev,
  parseWindowsCounters,
} from './systemUsage';

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

describe('computeDiskPercent', () => {
  it('reports used blocks as a percentage of total blocks', () => {
    expect(computeDiskPercent(200, 50)).toBe(75);
  });

  it('returns 0 when the filesystem reports no blocks', () => {
    expect(computeDiskPercent(0, 0)).toBe(0);
  });

  it('rounds to a whole percent', () => {
    expect(computeDiskPercent(300, 199)).toBe(34);
  });
});

describe('computeThroughputMbps', () => {
  it('converts byte deltas over the elapsed interval into whole Mbps', () => {
    const previous = { received: 1_000_000, sent: 500_000 };
    const current = { received: 2_000_000, sent: 750_000 };
    // 1 MB received and 250 kB sent over one second.
    expect(computeThroughputMbps(previous, current, 1000)).toEqual({
      downloadMbps: 8,
      uploadMbps: 2,
    });
  });

  it('rounds to the nearest whole Mbps', () => {
    expect(computeThroughputMbps({ received: 0, sent: 0 }, { received: 900_000, sent: 0 }, 1000))
      .toEqual({ downloadMbps: 7, uploadMbps: 0 });
  });

  it('returns 0 for a non-positive interval', () => {
    expect(
      computeThroughputMbps({ received: 0, sent: 0 }, { received: 1_000_000, sent: 1_000_000 }, 0)
    ).toEqual({ downloadMbps: 0, uploadMbps: 0 });
  });

  it('returns 0 when the counters reset between samples', () => {
    expect(
      computeThroughputMbps(
        { received: 5_000_000, sent: 5_000_000 },
        { received: 0, sent: 0 },
        2000
      )
    ).toEqual({ downloadMbps: 0, uploadMbps: 0 });
  });
});

describe('parseWindowsCounters', () => {
  it('sums adapter rows and ignores loopback', () => {
    const output = [
      'Ethernet|1000|500',
      'Loopback Pseudo-Interface 1|9999|9999',
      'vEthernet (Default Switch)|250|125',
    ].join('\r\n');
    expect(parseWindowsCounters(output)).toEqual({ received: 1250, sent: 625 });
  });

  it('returns null when no counters are readable', () => {
    expect(parseWindowsCounters('')).toBeNull();
  });
});

describe('parseProcNetDev', () => {
  const contents = [
    'Inter-|   Receive                                                |  Transmit',
    ' face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed',
    '    lo: 99999      10    0    0    0     0          0         0    99999      10    0    0    0     0       0          0',
    '  eth0:  1000      10    0    0    0     0          0         0      500      10    0    0    0     0       0          0',
    ' wlan0:   250       5    0    0    0     0          0         0      125       5    0    0    0     0       0          0',
  ].join('\n');

  it('sums non-loopback interface counters', () => {
    expect(parseProcNetDev(contents)).toEqual({ received: 1250, sent: 625 });
  });

  it('returns null when no counters are readable', () => {
    expect(parseProcNetDev('')).toBeNull();
  });
});

describe('parseNetstatIb', () => {
  const output = [
    'Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll',
    'lo0   16384 <Link#1>                           100     0       9999      100     0       9999     0',
    'en0   1500  <Link#4>     aa:bb:cc:dd:ee:ff     200     0       1000      150     0        500     0',
    'en0   1500  192.168.1.5  192.168.1.5            200     0       1000      150     0        500     0',
    'utun0 1380  <Link#12>                           10     0        250       10     0        125     0',
  ].join('\n');

  it('sums Ibytes/Obytes once per interface and ignores loopback', () => {
    expect(parseNetstatIb(output)).toEqual({ received: 1250, sent: 625 });
  });

  it('returns null when the header has no byte columns', () => {
    expect(parseNetstatIb('Name  Mtu   Network       Address            Ipkts Ierrs')).toBeNull();
  });
});

describe('getSystemUsage', () => {
  it('returns whole-number percentages and whole-Mbps throughput', async () => {
    // An unknown platform has no byte-counter reader, which keeps the suite offline.
    const platform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'freebsd' });
    try {
      const usage = await getSystemUsage();

      for (const percent of [usage.cpuPercent, usage.memoryPercent, usage.diskPercent]) {
        expect(Number.isInteger(percent)).toBe(true);
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      }

      for (const mbps of [usage.downloadMbps, usage.uploadMbps]) {
        expect(Number.isInteger(mbps)).toBe(true);
        expect(mbps).toBeGreaterThanOrEqual(0);
      }
    } finally {
      Object.defineProperty(process, 'platform', { value: platform });
    }
  });
});
