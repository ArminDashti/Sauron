import React, { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { defineMessages, useIntl } from '../../i18n';
import { cn } from '../../utils';
import { collapseContext, parseUnifiedDiff, type DiffLine, type DiffRow } from './diffParser';

const i18n = defineMessages({
  unmodifiedLines: {
    id: 'diffViewer.unmodifiedLines',
    defaultMessage: '{count} unmodified lines',
  },
  noDiff: {
    id: 'diffViewer.noDiff',
    defaultMessage: 'No textual changes to display',
  },
});

interface DiffViewerProps {
  diff: string;
}

const lineClass = (type: DiffLine['type']) =>
  cn(
    'flex min-w-max font-mono text-[11px] leading-[18px]',
    type === 'add' && 'bg-green-500/15',
    type === 'del' && 'bg-red-500/15'
  );

const LineRow: React.FC<{ line: DiffLine }> = ({ line }) => (
  <div className={lineClass(line.type)}>
    <span className="w-9 flex-shrink-0 select-none pr-2 text-right text-text-tertiary">
      {line.oldNumber ?? ''}
    </span>
    <span className="w-9 flex-shrink-0 select-none pr-2 text-right text-text-tertiary">
      {line.newNumber ?? ''}
    </span>
    <span
      className={cn(
        'w-4 flex-shrink-0 select-none text-center',
        line.type === 'add' && 'text-green-700 dark:text-green-400',
        line.type === 'del' && 'text-red-700 dark:text-red-400',
        (line.type === 'context' || line.type === 'hunk' || line.type === 'meta') &&
          'text-text-tertiary'
      )}
    >
      {line.type === 'add' ? '+' : line.type === 'del' ? '-' : line.type === 'context' ? ' ' : ''}
    </span>
    <span className="whitespace-pre pr-3">{line.content}</span>
  </div>
);

const MetaRow: React.FC<{ line: DiffLine }> = ({ line }) => (
  <div className="bg-background-secondary px-3 py-1 font-mono text-[10px] text-text-tertiary">
    {line.content}
  </div>
);

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const intl = useIntl();
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(() => new Set());

  const lines = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const rows = useMemo(() => collapseContext(lines), [lines]);

  if (!rows.length) {
    return (
      <div className="px-3 py-3 text-center text-xs text-text-tertiary">
        {intl.formatMessage(i18n.noDiff)}
      </div>
    );
  }

  const renderRow = (row: DiffRow, index: number): React.ReactNode => {
    if (row.type === 'hunk' || row.type === 'meta') {
      return <MetaRow key={`meta-${index}`} line={row} />;
    }
    if (row.type === 'collapsed') {
      if (expandedRuns.has(row.startIndex)) {
        return lines
          .slice(row.startIndex, row.startIndex + row.count)
          .map((line, lineIndex) => (
            <LineRow key={`expanded-${row.startIndex}-${lineIndex}`} line={line} />
          ));
      }
      return (
        <button
          key={`collapsed-${row.startIndex}`}
          type="button"
          onClick={() =>
            setExpandedRuns((prev) => {
              const next = new Set(prev);
              next.add(row.startIndex);
              return next;
            })
          }
          className="flex w-full items-center gap-2 bg-background-secondary px-3 py-1 text-left text-[11px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <ChevronsUpDown className="h-3 w-3 flex-shrink-0" />
          <span>{intl.formatMessage(i18n.unmodifiedLines, { count: row.count })}</span>
        </button>
      );
    }
    return <LineRow key={`line-${index}`} line={row} />;
  };

  return <div className="overflow-x-auto py-1">{rows.map(renderRow)}</div>;
};

export default DiffViewer;
