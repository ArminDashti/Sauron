import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Check, Loader2, RefreshCw, Search, Star, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ProviderLogo from '../providers/modal/subcomponents/ProviderLogo';
import {
  ContextBadge,
  DefaultBadge,
  ReasoningBadge,
  formatContextLimit,
} from './subcomponents/ModelBadges';
import {
  acpListSettingsProviderDetails,
  acpReadDefaults,
  acpRefreshProviderDetails,
  acpSaveDefaults,
} from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import type { RecentModel } from '../../../utils/settings';
import {
  addPreferredModel,
  isPreferredModel,
  removePreferredModel,
} from '../../../utils/preferredModels';
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
  showingCount: {
    id: 'allProviderModels.showingCount',
    defaultMessage: 'Showing {shown, number} of {total, number} models',
  },
  searchLabel: {
    id: 'allProviderModels.searchLabel',
    defaultMessage: 'Search models',
  },
  searchPlaceholder: {
    id: 'allProviderModels.searchPlaceholder',
    defaultMessage: 'Search models...',
  },
  noSearchResults: {
    id: 'allProviderModels.noSearchResults',
    defaultMessage: 'No models match "{query}".',
  },
  clearSearch: {
    id: 'allProviderModels.clearSearch',
    defaultMessage: 'Clear search',
  },
  clearSearchInput: {
    id: 'allProviderModels.clearSearchInput',
    defaultMessage: 'Clear search input',
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
  addPreferred: {
    id: 'allProviderModels.addPreferred',
    defaultMessage: 'Add {model} to preferred models',
  },
  removePreferred: {
    id: 'allProviderModels.removePreferred',
    defaultMessage: 'Remove {model} from preferred models',
  },
  preferredUpdateFailed: {
    id: 'allProviderModels.preferredUpdateFailed',
    defaultMessage: 'Failed to update preferred models',
  },
});

interface AllProviderModelsProps {
  /** Called after a model has been made the default so the parent can refresh. */
  onModelSelected?: () => void;
  /** Starred models shown in the chat model menu. */
  preferredModels: RecentModel[];
  onPreferredModelsChange: (next: RecentModel[]) => void;
}

/**
 * Aggregates the model inventory of every activated provider so the Models
 * section shows all selectable models in one place.
 */
export default function AllProviderModels({
  onModelSelected,
  preferredModels,
  onPreferredModelsChange,
}: AllProviderModelsProps) {
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
  const [query, setQuery] = useState('');

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
        onModelSelected?.();
      } catch (error) {
        toastError({
          title: intl.formatMessage(i18n.defaultSetFailed),
          msg: errorMessage(error),
        });
      }
    },
    [intl, onModelSelected]
  );

  const handleTogglePreferred = useCallback(
    async (provider: ProviderDetails, model: string) => {
      const isPreferred = isPreferredModel(preferredModels, provider.name, model);
      const next = isPreferred
        ? removePreferredModel(preferredModels, provider.name, model)
        : addPreferredModel(preferredModels, provider.name, model);
      try {
        await window.electron.setSetting('preferredModels', next);
        onPreferredModelsChange(next);
      } catch (error) {
        toastError({
          title: intl.formatMessage(i18n.preferredUpdateFailed),
          msg: errorMessage(error),
        });
      }
    },
    [preferredModels, onPreferredModelsChange, intl]
  );

  const totalModels = useMemo(
    () => providers.reduce((sum, provider) => sum + provider.metadata.known_models.length, 0),
    [providers]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return providers
      .map((provider) => {
        const models = provider.metadata.known_models;
        const providerMatches =
          normalizedQuery !== '' &&
          (provider.metadata.display_name.toLowerCase().includes(normalizedQuery) ||
            provider.name.toLowerCase().includes(normalizedQuery));
        const visibleModels =
          normalizedQuery === '' || providerMatches
            ? models
            : models.filter((model) => model.name.toLowerCase().includes(normalizedQuery));
        return { provider, models: visibleModels };
      })
      .filter((group) => normalizedQuery === '' || group.models.length > 0);
  }, [providers, normalizedQuery]);

  const visibleModels = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.models.length, 0),
    [filteredGroups]
  );

  const countText =
    normalizedQuery === ''
      ? intl.formatMessage(i18n.modelCount, { count: totalModels })
      : intl.formatMessage(i18n.showingCount, {
          shown: visibleModels,
          total: totalModels,
        });

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
              <span className="text-xs text-text-secondary" data-testid="all-provider-models-count">
                {countText}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={intl.formatMessage(i18n.searchPlaceholder)}
                    aria-label={intl.formatMessage(i18n.searchLabel)}
                    className="h-8 w-44 pl-8 pr-7 text-sm"
                    data-testid="all-provider-models-search"
                  />
                  {query !== '' && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label={intl.formatMessage(i18n.clearSearchInput)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
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
            </div>

            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-primary py-8">
                <p className="text-sm text-text-secondary">
                  {intl.formatMessage(i18n.noSearchResults, { query: query.trim() })}
                </p>
                <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                  {intl.formatMessage(i18n.clearSearch)}
                </Button>
              </div>
            ) : (
              filteredGroups.map(({ provider, models }) => {
                const error = refreshErrors[provider.name];
                const isCurrentProvider = defaults.providerId === provider.name;
                return (
                  <div
                    key={provider.name}
                    data-testid={`all-provider-models-${provider.name}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo providerName={provider.name} size="sm" />
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="truncate text-sm font-medium text-text-primary">
                          {provider.metadata.display_name}
                        </h3>
                        <span className="text-xs text-text-secondary">
                          {intl.formatMessage(i18n.modelCount, { count: models.length })}
                        </span>
                      </div>
                    </div>

                    {error && (
                      <p className="flex items-center gap-2 text-xs text-red-500">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {intl.formatMessage(i18n.refreshFailed, {
                          provider: provider.metadata.display_name,
                          error,
                        })}
                      </p>
                    )}

                    {models.length === 0 ? (
                      <p className="text-xs text-text-secondary">
                        {intl.formatMessage(i18n.noModels)}
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {models.map((model) => {
                          const isCurrent = isCurrentProvider && defaults.modelId === model.name;
                          const contextText = formatContextLimit(model.context_limit);
                          const isPreferred = isPreferredModel(
                            preferredModels,
                            provider.name,
                            model.name
                          );
                          return (
                            <div key={model.name} className="flex min-w-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSelectModel(provider, model.name)}
                                title={
                                  contextText
                                    ? `${model.name} (${contextText} context)`
                                    : model.name
                                }
                                aria-pressed={isCurrent}
                                data-testid={`all-provider-model-${provider.name}-${model.name}`}
                                className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                                  isCurrent
                                    ? 'border-border-secondary bg-background-tertiary'
                                    : 'border-border-primary bg-background-secondary hover:border-border-secondary hover:bg-background-tertiary'
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                    isCurrent
                                      ? 'border-background-inverse bg-background-inverse text-text-inverse'
                                      : 'border-border-secondary'
                                  }`}
                                >
                                  {isCurrent && <Check className="h-2.5 w-2.5" />}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                                  {model.name}
                                </span>
                                <ContextBadge contextLimit={model.context_limit} compact />
                                {model.reasoning && <ReasoningBadge />}
                                {isCurrent && <DefaultBadge />}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleTogglePreferred(provider, model.name)}
                                aria-label={intl.formatMessage(
                                  isPreferred ? i18n.removePreferred : i18n.addPreferred,
                                  { model: model.name }
                                )}
                                aria-pressed={isPreferred}
                                className={`shrink-0 rounded-md px-1.5 py-1.5 transition-colors ${
                                  isPreferred
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-text-secondary opacity-60 hover:text-text-primary hover:opacity-100'
                                }`}
                              >
                                <Star className={`h-3.5 w-3.5 ${isPreferred ? 'fill-current' : ''}`} />
                              </button>
                            </div>
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
