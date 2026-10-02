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
import { defineMessages, useIntl } from '../../../i18n';
import { errorMessage } from '../../../utils/conversionUtils';
import { toastError, toastSuccess } from '../../../toasts';
import FreeModelBadge from './FreeModelBadge';
import { collectKnownFreeKeys, modelKey } from './freeModels';

const FREE_ONLY_STORAGE_KEY = 'modelsFreeOnly';

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
  filterAll: {
    id: 'allProviderModels.filterAll',
    defaultMessage: 'All',
  },
  filterFree: {
    id: 'allProviderModels.filterFree',
    defaultMessage: 'Free',
  },
  freeCount: {
    id: 'allProviderModels.freeCount',
    defaultMessage: '{count} free',
  },
  noFreeModels: {
    id: 'allProviderModels.noFreeModels',
    defaultMessage: 'No free models from your providers.',
  },
  noFreeModelsHint: {
    id: 'allProviderModels.noFreeModelsHint',
    defaultMessage:
      'Models show as free when a provider runs them locally (Ollama, local models) or lists free variants, such as the :free models from OpenRouter.',
  },
  showAll: {
    id: 'allProviderModels.showAll',
    defaultMessage: 'Show all models',
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
  const [freeOnly, setFreeOnly] = useState<boolean>(
    () => localStorage.getItem(FREE_ONLY_STORAGE_KEY) === 'true'
  );

  const handleFreeOnly = useCallback((value: boolean) => {
    setFreeOnly(value);
    localStorage.setItem(FREE_ONLY_STORAGE_KEY, String(value));
  }, []);

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

  const providerRows = useMemo(() => {
    const freeKeys = collectKnownFreeKeys(
      providers.map((provider) => ({
        name: provider.name,
        models: provider.metadata.known_models.map((model) => model.name),
      }))
    );
    return providers.map((provider) => {
      const models = provider.metadata.known_models;
      const freeModels = models.filter((model) =>
        freeKeys.has(modelKey(provider.name, model.name))
      );
      return { provider, models, freeModels };
    });
  }, [providers]);

  const totalFreeModels = useMemo(
    () => providerRows.reduce((sum, row) => sum + row.freeModels.length, 0),
    [providerRows]
  );

  const visibleRows = useMemo(
    () => (freeOnly ? providerRows.filter((row) => row.freeModels.length > 0) : providerRows),
    [freeOnly, providerRows]
  );

  const filterButtonClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
      active
        ? 'border-text-inverse bg-background-inverse text-text-inverse'
        : 'border-border-primary bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
    }`;

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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="group">
                <button
                  type="button"
                  data-testid="models-filter-all"
                  aria-pressed={!freeOnly}
                  onClick={() => handleFreeOnly(false)}
                  className={filterButtonClass(!freeOnly)}
                >
                  {intl.formatMessage(i18n.filterAll)}{' '}
                  <span className="opacity-70">{totalModels}</span>
                </button>
                <button
                  type="button"
                  data-testid="models-filter-free"
                  aria-pressed={freeOnly}
                  onClick={() => handleFreeOnly(true)}
                  className={filterButtonClass(freeOnly)}
                >
                  {intl.formatMessage(i18n.filterFree)}{' '}
                  <span className="opacity-70">{totalFreeModels}</span>
                </button>
              </div>
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

            {visibleRows.length === 0 ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-text-primary">
                    {intl.formatMessage(i18n.noFreeModels)}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {intl.formatMessage(i18n.noFreeModelsHint)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleFreeOnly(false)}>
                  {intl.formatMessage(i18n.showAll)}
                </Button>
              </div>
            ) : (
              visibleRows.map((row) => {
                const { provider, freeModels } = row;
                const models = freeOnly ? freeModels : row.models;
                const freeModelNames = new Set(freeModels.map((model) => model.name));
                const error = refreshErrors[provider.name];
                const isCurrentProvider = defaults.providerId === provider.name;
                return (
                  <div key={provider.name} data-testid={`all-provider-models-${provider.name}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm text-text-primary">
                        {provider.metadata.display_name}
                      </h3>
                      <span className="text-xs text-text-secondary">
                        {intl.formatMessage(i18n.modelCount, { count: models.length })}
                      </span>
                      {!freeOnly && freeModels.length > 0 && (
                        <span
                          className="text-xs text-emerald-600 dark:text-emerald-400"
                          data-testid={`provider-free-count-${provider.name}`}
                        >
                          {intl.formatMessage(i18n.freeCount, { count: freeModels.length })}
                        </span>
                      )}
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
                          const isFree = freeModelNames.has(model.name);
                          const contextSuffix = model.context_limit
                            ? ` (${Math.round(model.context_limit / 1024)}k context)`
                            : '';
                          return (
                            <button
                              key={model.name}
                              type="button"
                              onClick={() => handleSelectModel(provider, model.name)}
                              title={`${model.name}${contextSuffix}${isFree ? ' · free' : ''}`}
                              aria-pressed={isCurrent}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                isCurrent
                                  ? 'border-text-inverse bg-background-inverse text-text-inverse'
                                  : 'border-border-primary bg-background-secondary text-text-primary hover:border-border-secondary hover:bg-background-tertiary'
                              }`}
                            >
                              {isCurrent && <Check className="h-3 w-3" aria-hidden="true" />}
                              {model.name}
                              {isFree && !freeOnly && <FreeModelBadge className="ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
