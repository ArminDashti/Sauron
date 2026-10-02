import { Sparkles } from 'lucide-react';
import { defineMessages, useIntl } from '../../../../i18n';

const i18n = defineMessages({
  contextWindow: {
    id: 'modelBadges.contextWindow',
    defaultMessage: '{amount, number}k context',
  },
  contextShort: {
    id: 'modelBadges.contextShort',
    defaultMessage: '{amount, number}k',
  },
  reasoning: {
    id: 'modelBadges.reasoning',
    defaultMessage: 'Reasoning',
  },
  default: {
    id: 'modelBadges.default',
    defaultMessage: 'Default',
  },
});

const badgeClassName =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-background-tertiary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary';

/** Formats a token context limit (e.g. 200000) as "200k", or null when unknown. */
export function formatContextLimit(contextLimit?: number | null): string | null {
  if (!contextLimit || contextLimit <= 0) {
    return null;
  }
  return `${Math.round(contextLimit / 1024)}k`;
}

export function ContextBadge({
  contextLimit,
  compact = false,
}: {
  contextLimit?: number | null;
  compact?: boolean;
}) {
  const intl = useIntl();
  const amount = contextLimit && contextLimit > 0 ? Math.round(contextLimit / 1024) : null;
  if (amount === null) {
    return null;
  }
  return (
    <span className={badgeClassName}>
      {intl.formatMessage(compact ? i18n.contextShort : i18n.contextWindow, { amount })}
    </span>
  );
}

export function ReasoningBadge() {
  const intl = useIntl();
  return (
    <span className={badgeClassName}>
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {intl.formatMessage(i18n.reasoning)}
    </span>
  );
}

export function DefaultBadge() {
  const intl = useIntl();
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-background-inverse px-2 py-0.5 text-[11px] font-medium text-text-inverse">
      {intl.formatMessage(i18n.default)}
    </span>
  );
}
