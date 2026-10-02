export type DiffLineType = 'hunk' | 'context' | 'add' | 'del' | 'meta';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldNumber: number | null;
  newNumber: number | null;
}

export interface CollapsedContextRow {
  type: 'collapsed';
  count: number;
  startIndex: number;
}

export type DiffRow = DiffLine | CollapsedContextRow;

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Runs of unchanged lines longer than this are folded into a collapsed row. */
export const COLLAPSE_THRESHOLD = 6;
/** Number of lines kept visible on each side of a collapsed run. */
export const COLLAPSE_KEEP = 3;

/**
 * Parse a unified diff into display rows. File headers before the first hunk
 * are skipped; hunk headers and "\ No newline" markers are kept as meta rows.
 */
export function parseUnifiedDiff(diff: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldNumber = 0;
  let newNumber = 0;
  let inHunk = false;

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      inHunk = false;
      continue;
    }
    if (raw.startsWith('@@')) {
      const match = HUNK_HEADER.exec(raw);
      if (!match) continue;
      oldNumber = parseInt(match[1], 10);
      newNumber = parseInt(match[2], 10);
      inHunk = true;
      lines.push({ type: 'hunk', content: raw, oldNumber: null, newNumber: null });
      continue;
    }
    if (!inHunk) continue;
    if (raw.startsWith('\\')) {
      lines.push({ type: 'meta', content: raw.slice(1).trim(), oldNumber: null, newNumber: null });
      continue;
    }
    if (raw.startsWith('+')) {
      lines.push({ type: 'add', content: raw.slice(1), oldNumber: null, newNumber: newNumber++ });
      continue;
    }
    if (raw.startsWith('-')) {
      lines.push({ type: 'del', content: raw.slice(1), oldNumber: oldNumber++, newNumber: null });
      continue;
    }
    if (raw.startsWith(' ') || raw === '') {
      lines.push({
        type: 'context',
        content: raw === '' ? '' : raw.slice(1),
        oldNumber: oldNumber++,
        newNumber: newNumber++,
      });
      continue;
    }
    lines.push({ type: 'meta', content: raw, oldNumber: null, newNumber: null });
  }
  return lines;
}

/**
 * Fold long runs of unchanged lines into collapsed rows so large files stay
 * scannable, mirroring the "N unmodified lines" rows in the changes view.
 */
export function collapseContext(
  lines: DiffLine[],
  threshold = COLLAPSE_THRESHOLD,
  keep = COLLAPSE_KEEP
): DiffRow[] {
  const rows: DiffRow[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type !== 'context') {
      rows.push(lines[i]);
      i++;
      continue;
    }
    let end = i;
    while (end < lines.length && lines[end].type === 'context') end++;
    const runLength = end - i;
    if (runLength > threshold) {
      rows.push(...lines.slice(i, i + keep));
      rows.push({ type: 'collapsed', count: runLength, startIndex: i });
      rows.push(...lines.slice(end - keep, end));
    } else {
      rows.push(...lines.slice(i, end));
    }
    i = end;
  }
  return rows;
}
