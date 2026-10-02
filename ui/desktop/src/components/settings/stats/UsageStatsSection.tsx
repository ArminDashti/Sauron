import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../utils';
import { formatCost, formatTokenCount } from '../../../utils/usageFormatting';
import { toDateString } from '../../../utils/usageStats';
import { defineMessages, useIntl } from '../../../i18n';
import type {
  UsageStatsBucket,
  UsageStatsRange,
  UsageStatsResult,
} from '../../../types/usageStats';

const i18n = defineMessages({
  rangeLabel: {
    id: 'usageStats.rangeLabel',
    defaultMessage: 'Date range',
  },
  rangeDescription: {
    id: 'usageStats.rangeDescription',
    defaultMessage: 'Usage is grouped by model and by provider for the selected dates.',
  },
  rangeFrom: {
    id: 'usageStats.rangeFrom',
    defaultMessage: 'From',
  },
  rangeTo: {
    id: 'usageStats.rangeTo',
    defaultMessage: 'To',
  },
  preset7: {
    id: 'usageStats.preset7',
    defaultMessage: 'Last 7 days',
  },
  preset30: {
    id: 'usageStats.preset30',
    defaultMessage: 'Last 30 days',
  },
  presetYear: {
    id: 'usageStats.presetYear',
    defaultMessage: 'This year',
  },
  presetAll: {
    id: 'usageStats.presetAll',
    defaultMessage: 'All time',
  },
  byModel: {
    id: 'usageStats.byModel',
    defaultMessage: 'Per model',
  },
  byProvider: {
    id: 'usageStats.byProvider',
    defaultMessage: 'Per provider',
  },
  modelColumn: {
    id: 'usageStats.modelColumn',
    defaultMessage: 'Model',
  },
  providerColumn: {
    id: 'usageStats.providerColumn',
    defaultMessage: 'Provider',
  },
  inputTokens: {
    id: 'usageStats.inputTokens',
    defaultMessage: 'Input tokens',
  },
  inputCacheTokens: {
    id: 'usageStats.inputCacheTokens',
    defaultMessage: 'Input cache tokens',
  },
  writeTokens: {
    id: 'usageStats.writeTokens',
    defaultMessage: 'Write tokens',
  },
  writeCacheTokens: {
    id: 'usageStats.writeCacheTokens',
    defaultMessage: 'Write cache tokens',
  },
  cost: {
    id: 'usageStats.cost',
    defaultMessage: 'Cost',
  },
  total: {
    id: 'usageStats.total',
    defaultMessage: 'Total',
  },
  unknown: {
    id: 'usageStats.unknown',
    defaultMessage: 'Unknown',
  },
  empty: {
    id: 'usageStats.empty',
    defaultMessage: 'No usage was recorded in this date range.',
  },
  loading: {
    id: 'usageStats.loading',
    defaultMessage: 'Loading usage stats…',
  },
  sessions: {
    id: 'usageStats.sessions',
    defaultMessage: '{count, plural, one {# session} other {# sessions}}',
  },
  sourceLedger: {
    id: 'usageStats.sourceLedger',
    defaultMessage: 'Recorded usage',
  },
  sourceMessages: {
    id: 'usageStats.sourceMessages',
    defaultMessage: 'Estimated from stored messages',
  },
});

const HEAD_CLASS = 'px-3 py-2 text-right text-xs font-medium whitespace-nowrap';
const CELL_CLASS = 'px-3 py-2 text-right font-mono text-xs tabular-nums whitespace-nowrap';

function defaultRange(): UsageStatsRange {
  return presetDays(30);
}

function presetDays(days: number): UsageStatsRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from: toDateString(from), to: toDateString(to) };
}

function formatCell(value: number): string {
  return value === 0 ? '0' : formatTokenCount(value);
}

function StatsTable({
  rows,
  total,
  keyColumnLabel,
}: {
  rows: UsageStatsBucket[];
  total?: UsageStatsBucket;
  keyColumnLabel: string;
}) {
  const intl = useIntl();

  if (rows.length === 0) {
    return <p className="px-1 py-3 text-sm text-text-secondary">{intl.formatMessage(i18n.empty)}</p>;
  }

  const renderCells = (bucket: UsageStatsBucket, className: string) => (
    <>
      <td className={className}>{formatCell(bucket.inputTokens)}</td>
      <td className={className}>{formatCell(bucket.inputCacheTokens)}</td>
      <td className={className}>{formatCell(bucket.writeTokens)}</td>
      <td className={className}>{formatCell(bucket.writeCacheTokens)}</td>
      <td className={className}>
        {bucket.cost === null ? '—' : formatCost(bucket.cost)}
      </td>
    </>
  );

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-primary text-text-secondary">
            <th className="px-3 py-2 text-left text-xs font-medium">{keyColumnLabel}</th>
            <th className={HEAD_CLASS}>{intl.formatMessage(i18n.inputTokens)}</th>
            <th className={HEAD_CLASS}>{intl.formatMessage(i18n.inputCacheTokens)}</th>
            <th className={HEAD_CLASS}>{intl.formatMessage(i18n.writeTokens)}</th>
            <th className={HEAD_CLASS}>{intl.formatMessage(i18n.writeCacheTokens)}</th>
            <th className={HEAD_CLASS}>{intl.formatMessage(i18n.cost)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border-primary/50 last:border-none">
              <td
                className="max-w-64 truncate px-3 py-2 text-left text-text-primary"
                title={row.key}
              >
                {row.key || intl.formatMessage(i18n.unknown)}
              </td>
              {renderCells(row, CELL_CLASS)}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="border-t border-border-primary font-medium">
              <td className="px-3 py-2 text-left text-text-primary">
                {intl.formatMessage(i18n.total)}
              </td>
              {renderCells(total, `${CELL_CLASS} text-text-primary`)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/**
 * Settings > Stats: input/cache/write token totals and cost for a date range,
 * broken down per model and per provider.
 */
export default function UsageStatsSection() {
  const intl = useIntl();
  const [range, setRange] = useState<UsageStatsRange>(defaultRange);
  const [result, setResult] = useState<UsageStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async (requested: UsageStatsRange) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const stats = await window.electron.getUsageStats(requested);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResult(stats);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResult(null);
      console.error('Failed to load usage stats:', error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const updateRange = (patch: Partial<UsageStatsRange>) => {
    setRange((current) => {
      const next = { ...current, ...patch };
      if (next.from > next.to) {
        // Keep the edited bound and pull the other one along with it.
        return patch.from !== undefined
          ? { from: next.from, to: next.from }
          : { from: next.to, to: next.to };
      }
      return next;
    });
  };

  const presets: { label: string; apply: () => void }[] = [
    { label: intl.formatMessage(i18n.preset7), apply: () => setRange(presetDays(7)) },
    { label: intl.formatMessage(i18n.preset30), apply: () => setRange(presetDays(30)) },
    {
      label: intl.formatMessage(i18n.presetYear),
      apply: () => {
        const today = new Date();
        setRange({
          from: toDateString(new Date(today.getFullYear(), 0, 1)),
          to: toDateString(today),
        });
      },
    },
    {
      label: intl.formatMessage(i18n.presetAll),
      apply: () => setRange({ from: '1970-01-01', to: toDateString(new Date()) }),
    },
  ];

  const error = result?.error ?? null;
  const isEmpty =
    !loading && !error && !!result && result.models.length === 0 && result.providers.length === 0;
  const sourceLabel =
    result?.source === 'usage-ledger'
      ? intl.formatMessage(i18n.sourceLedger)
      : result?.source === 'message-metadata'
        ? intl.formatMessage(i18n.sourceMessages)
        : null;

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {intl.formatMessage(i18n.rangeLabel)}
          </CardTitle>
          <CardDescription>{intl.formatMessage(i18n.rangeDescription)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            {intl.formatMessage(i18n.rangeFrom)}
            <Input
              type="date"
              value={range.from}
              max={range.to}
              className="w-40"
              onChange={(event) => updateRange({ from: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            {intl.formatMessage(i18n.rangeTo)}
            <Input
              type="date"
              value={range.to}
              min={range.from}
              className="w-40"
              onChange={(event) => updateRange({ to: event.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button key={preset.label} variant="outline" size="sm" onClick={preset.apply}>
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
        {loading ? (
          <span>{intl.formatMessage(i18n.loading)}</span>
        ) : (
          <>
            <span>{intl.formatMessage(i18n.sessions, { count: result?.sessions ?? 0 })}</span>
            {sourceLabel && <span className="text-text-tertiary">· {sourceLabel}</span>}
          </>
        )}
      </div>

      {error && <p className="text-sm text-text-secondary">{error}</p>}
      {isEmpty && <p className="text-sm text-text-secondary">{intl.formatMessage(i18n.empty)}</p>}

      <Card className={cn(loading && 'opacity-60')}>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {intl.formatMessage(i18n.byModel)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatsTable
            rows={result?.models ?? []}
            total={result?.total}
            keyColumnLabel={intl.formatMessage(i18n.modelColumn)}
          />
        </CardContent>
      </Card>

      <Card className={cn(loading && 'opacity-60')}>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {intl.formatMessage(i18n.byProvider)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatsTable
            rows={result?.providers ?? []}
            keyColumnLabel={intl.formatMessage(i18n.providerColumn)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
