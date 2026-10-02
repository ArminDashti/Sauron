import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  label: {
    id: 'freeModelBadge.label',
    defaultMessage: 'Free',
  },
});

type FreeModelBadgeProps = {
  className?: string;
};

/** Small pill marking a model that costs nothing to run. */
export default function FreeModelBadge({ className = '' }: FreeModelBadgeProps) {
  const intl = useIntl();
  return (
    <span
      data-testid="model-free-badge"
      className={`inline-flex shrink-0 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 ${className}`}
    >
      {intl.formatMessage(i18n.label)}
    </span>
  );
}
