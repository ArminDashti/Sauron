import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  acpListSettingsProviderDetails,
  acpReadDefaults,
  acpRefreshProviderDetails,
  acpSaveDefaults,
} from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import ModelIcon from '../../logos/ModelIcon';
import { defineMessages, useIntl } from '../../../i18n';
import { errorMessage } from '../../../utils/conversionUtils';
import { toastError, toastSuccess } from '../../../toasts';

const i18n = defineMessages({
  title: {
    id: 'allProviderModels.title',
    defaultMessage: 'Models from your providers',
  },
  description: {
    id: 'allProviderModels.description',
    defaultMessage:
      'Every model exposed by your activated providers. Select one to make it the default model.',
  },
  loading: {
    id: 'allProviderModels.loading',
    defaultMessage: 'Loading models from your providers...',
  },
  loadFailed: {
    id: 'allProviderModels.loadFailed',
    defaultMessage: 'Could not load provider models',
  },
  empty: {
    id: 'allProviderModels.empty',
    defaultMessage: 'No activated providers yet.',
  },
  emptyHint: {
    id: 'allProviderModels.emptyHint',
    defaultMessage: 'Configure a provider to see the models it offers.',
  },
  configureProviders: {
    id: 'allProviderModels.configureProviders',
    defaultMessage: 'Configure providers',
  },
  refreshAll: {
    id: 'allProviderModels.refreshAll',
    defaultMessage: 'Refresh models',
  },
  refreshing: {
    id: 'allProviderModels.refreshing',
    defaultMessage: 'Refreshing...',
  },
  noModels: {
    id: 'allProviderModels.noModels',
    defaultMessage: 'No models reported by this provider.',
  },
  modelCount: {
    id: 'allProviderModels.modelCount',
    defaultMessage: '{count, plural, one {# model} other {# models}}',
  },
  defaultSet: {
    id: 'allProviderModels.defaultSet',
    defaultMessage: '{model} is now your default model.',
  },
  defaultSetFailed: {
    id: 'allProviderModels.defaultSetFailed',
    defaultMessage: 'Failed to set default model',
  },
  refreshFailed: {
    id: 'allProviderModels.refreshFailed',
    defaultMessage: 'Could not refresh {provider}: {error}',
  },
});

/**
 * Aggregates the model inventory of every activated provider so the Models
 * section shows all selectable models in one place.
 */
export default function AllProviderModels() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderDetails[]>([]);
  const [defaults, setDefaults] = useState<{ providerId: string | null; modelId: string | null }>({
    providerId: null,
    modelId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshErrors, setRefreshErrors] = useState<Record<string, string>>({});

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [all, currentDefaults] = await Promise.all([
        acpListSettingsProviderDetails(),
        acpReadDefaults(),
      ]);
      setProviders(all.filter((provider) => provider.is_configured));
      setDefaults(currentDefaults);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshErrors({});
    try {
      const results = await Promise.all(
        providers.map(async (provider) => {
          try {
            const { provider: updated, readinessError } = await acpRefreshProviderDetails(
              provider.name
            );
            return { provider: updated, error: readinessError ?? updated.last_refresh_error };
          } catch (error) {
            return { provider, error: errorMessage(error) };
          }
        })
      );

      setProviders(results.map((result) => result.provider));
      const errors: Record<string, string> = {};
      for (const result of results) {
        if (result.error) {
          errors[result.provider.name] = result.error;
        }
      }
      setRefreshErrors(errors);
    } finally {
      setIsRefreshing(false);
    }
  }, [providers]);

  const handleSelectModel = useCallback(
    async (provider: ProviderDetails, model: string) => {
      try {
        await acpSaveDefaults(provider.name, model);
        setDefaults({ providerId: provider.name, modelId: model });
        toastSuccess({
          title: intl.formatMessage(i18n.defaultSet, { model }),
          msg: '',
        });
      } catch (error) {
        toastError({
          title: intl.formatMessage(i18n.defaultSetFailed),
          msg: errorMessage(error),
        });
      }
    },
    [intl]
  );

  const totalModels = useMemo(
    () => providers.reduce((sum, provider) => sum + provider.metadata.known_models.length, 0),
    [providers]
  );

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-0">
        <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
        <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {intl.formatMessage(i18n.loading)}
          </div>
        ) : loadError ? (
          <p className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {intl.formatMessage(i18n.loadFailed)}: {loadError}
          </p>
        ) : providers.length === 0 ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-text-primary">{intl.formatMessage(i18n.empty)}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {intl.formatMessage(i18n.emptyHint)}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/settings?section=providers')}
            >
              {intl.formatMessage(i18n.configureProviders)}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-secondary">
                {intl.formatMessage(i18n.modelCount, { count: totalModels })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                data-testid="all-provider-models-refresh"
              >
                {isRefreshing ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
                )}
                {isRefreshing
                  ? intl.formatMessage(i18n.refreshing)
                  : intl.formatMessage(i18n.refreshAll)}
              </Button>
            </div>

            {providers.map((provider) => {
              const models = provider.metadata.known_models;
              const error = refreshErrors[provider.name];
              const isCurrentProvider = defaults.providerId === provider.name;
              return (
                <div key={provider.name} data-testid={`all-provider-models-${provider.name}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <ModelIcon provider={provider.name} className="h-4 w-4" />
                    <h3 className="text-sm text-text-primary">
                      {provider.metadata.display_name}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {intl.formatMessage(i18n.modelCount, { count: models.length })}
                    </span>
                  </div>

                  {error && (
                    <p className="mt-1 text-xs text-red-500">
                      {intl.formatMessage(i18n.refreshFailed, {
                        provider: provider.metadata.display_name,
                        error,
                      })}
                    </p>
                  )}

                  {models.length === 0 ? (
                    <p className="mt-1 text-xs text-text-secondary">
                      {intl.formatMessage(i18n.noModels)}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {models.map((model) => {
                        const isCurrent = isCurrentProvider && defaults.modelId === model.name;
                        return (
                          <button
                            key={model.name}
                            type="button"
                            onClick={() => handleSelectModel(provider, model.name)}
                            title={
                              model.context_limit
                                ? `${model.name} (${Math.round(model.context_limit / 1024)}k context)`
                                : model.name
                            }
                            aria-pressed={isCurrent}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              isCurrent
                                ? 'border-text-inverse bg-background-inverse text-text-inverse'
                                : 'border-border-primary bg-background-secondary text-text-primary hover:border-border-secondary hover:bg-background-tertiary'
                            }`}
                          >
                            {isCurrent && <Check className="h-3 w-3" aria-hidden="true" />}
                            {model.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
