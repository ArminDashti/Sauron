import { useCallback } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { useModelAndProvider } from '../../ModelAndProviderContext';
import type { RecentModel } from '../../../utils/settings';
import { removePreferredModel } from '../../../utils/preferredModels';
import { getModelDisplayName } from './predefinedModelsUtils';
import { toastError } from '../../../toasts';
import { errorMessage } from '../../../utils/conversionUtils';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  title: {
    id: 'preferredModels.title',
    defaultMessage: 'Preferred models',
  },
  empty: {
    id: 'preferredModels.empty',
    defaultMessage: 'Star models below to keep them handy here and in chats.',
  },
  remove: {
    id: 'preferredModels.remove',
    defaultMessage: 'Remove {model} from preferred models',
  },
  removeFailed: {
    id: 'preferredModels.removeFailed',
    defaultMessage: 'Failed to update preferred models',
  },
});

interface PreferredModelsProps {
  preferredModels: RecentModel[];
  onPreferredModelsChange: (next: RecentModel[]) => void;
}

export default function PreferredModels({
  preferredModels,
  onPreferredModelsChange,
}: PreferredModelsProps) {
  const intl = useIntl();
  const { changeModel } = useModelAndProvider();

  const handleSelect = useCallback(
    async (preferred: RecentModel) => {
      await changeModel(null, {
        name: preferred.model,
        provider: preferred.provider,
      });
    },
    [changeModel]
  );

  const handleRemove = useCallback(
    async (preferred: RecentModel) => {
      try {
        const next = removePreferredModel(preferredModels, preferred.provider, preferred.model);
        await window.electron.setSetting('preferredModels', next);
        onPreferredModelsChange(next);
      } catch (error) {
        toastError({
          title: intl.formatMessage(i18n.removeFailed),
          msg: errorMessage(error),
        });
      }
    },
    [preferredModels, onPreferredModelsChange, intl]
  );

  return (
    <Card className="rounded-lg" data-testid="preferred-models">
      <CardHeader className="pb-0">
        <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
        {preferredModels.length === 0 && (
          <CardDescription>{intl.formatMessage(i18n.empty)}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 pt-4">
        {preferredModels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {preferredModels.map((preferred) => {
              const label = getModelDisplayName(preferred.model);
              return (
                <div
                  key={`${preferred.provider}/${preferred.model}`}
                  className="inline-flex items-center rounded-full border border-border-primary bg-background-secondary text-text-primary transition-colors hover:border-border-secondary hover:bg-background-tertiary"
                >
                  <button
                    type="button"
                    onClick={() => void handleSelect(preferred)}
                    title={`${preferred.model} — ${preferred.provider}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                  >
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(preferred)}
                    aria-label={intl.formatMessage(i18n.remove, { model: label })}
                    className="px-1.5 py-1 text-text-secondary hover:text-text-primary"
                  >
                    <span aria-hidden="true" className="text-xs leading-none">
                      ×
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
