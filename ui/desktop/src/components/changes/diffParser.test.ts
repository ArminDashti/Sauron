/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { collapseContext, parseUnifiedDiff } from './diffParser';

const SAMPLE = [
  'diff --git a/src/example.ts b/src/example.ts',
  'index 1234567..89abcde 100644',
  '--- a/src/example.ts',
  '+++ b/src/example.ts',
  '@@ -10,7 +10,8 @@ export function example() {',
  ' const a = 1;',
  ' const b = 2;',
  ' const c = 3;',
  '-const d = 4;',
  '+const d = 44;',
  '+const e = 5;',
  ' const f = 6;',
  ' const g = 7;',
  ' const h = 8;',
  '\\ No newline at end of file',
].join('\n');

describe('parseUnifiedDiff', () => {
  it('skips file headers and parses hunk lines with line numbers', () => {
    const lines = parseUnifiedDiff(SAMPLE);
    expect(lines[0].type).toBe('hunk');
    expect(lines.filter((l) => l.type === 'hunk')).toHaveLength(1);

    const context = lines.filter((l) => l.type === 'context');
    expect(context[0]).toMatchObject({
      oldNumber: 10,
      newNumber: 10,
      content: ' const a = 1;'.trim(),
    });

    const del = lines.find((l) => l.type === 'del');
    expect(del).toMatchObject({ oldNumber: 13, newNumber: null, content: 'const d = 4;' });

    const adds = lines.filter((l) => l.type === 'add');
    expect(adds).toHaveLength(2);
    expect(adds[0]).toMatchObject({ oldNumber: null, newNumber: 13, content: 'const d = 44;' });
    expect(adds[1].newNumber).toBe(14);
  });

  it('keeps the no-newline marker as a meta row', () => {
    const lines = parseUnifiedDiff(SAMPLE);
    const meta = lines.filter((l) => l.type === 'meta');
    expect(meta).toHaveLength(1);
    expect(meta[0].content).toContain('No newline at end of file');
  });

  it('tracks line numbers across multiple hunks', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', '-b', '+B', '@@ -10,2 +10,2 @@', ' j', '-k', '+K'].join(
      '\n'
    );
    const lines = parseUnifiedDiff(diff);
    const secondHunkIndex = lines.findIndex((l, i) => l.type === 'hunk' && i > 0);
    expect(secondHunkIndex).toBeGreaterThan(0);
    expect(lines[secondHunkIndex + 1]).toMatchObject({ oldNumber: 10, newNumber: 10 });
  });

  it('returns nothing for an empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });
});

describe('collapseContext', () => {
  it('collapses long runs of unchanged lines into a single row', () => {
    const diff = [
      '@@ -1,20 +1,20 @@',
      ...Array.from({ length: 18 }, (_, i) => ` line${i}`),
      '-old',
      '+new',
    ].join('\n');
    const rows = collapseContext(parseUnifiedDiff(diff));
    const collapsed = rows.filter((r) => r.type === 'collapsed');
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toMatchObject({ type: 'collapsed', count: 18, startIndex: 1 });
    // 3 lines before + collapsed row + (no trailing run here)
    expect(rows[0].type).toBe('hunk');
    expect(rows[1]).toMatchObject({ type: 'context', oldNumber: 1 });
    expect(rows.some((r) => r.type === 'collapsed')).toBe(true);
  });

  it('keeps short runs of unchanged lines intact', () => {
    const diff = ['@@ -1,5 +1,5 @@', ' a', ' b', ' c', '-d', '+D'].join('\n');
    const rows = collapseContext(parseUnifiedDiff(diff));
    expect(rows.some((r) => r.type === 'collapsed')).toBe(false);
  });

  it('keeps context around a collapsed run visible on both sides', () => {
    const diff = [
      '@@ -1,30 +1,30 @@',
      '-old',
      '+new',
      ...Array.from({ length: 12 }, (_, i) => ` mid${i}`),
      '-old2',
      '+new2',
    ].join('\n');
    const rows = collapseContext(parseUnifiedDiff(diff));
    const collapsedIndex = rows.findIndex((r) => r.type === 'collapsed');
    expect(collapsedIndex).toBeGreaterThan(0);
    expect(rows[collapsedIndex - 1]).toMatchObject({ type: 'context', content: 'mid2' });
    expect(rows[collapsedIndex + 1]).toMatchObject({ type: 'context', content: 'mid9' });
  });
});
