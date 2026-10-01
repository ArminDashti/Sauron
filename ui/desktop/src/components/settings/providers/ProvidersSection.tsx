import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ProviderConfigurationModal from './modal/ProviderConfigurationModal';
import {
  acpListSettingsProviderDetails,
  acpRefreshProviderDetails,
  acpSaveDefaults,
} from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import type { View } from '../../../utils/navigationUtils';
import { defineMessages, useIntl } from '../../../i18n';
import { toastError, toastSuccess } from '../../../toasts';

/** Providers surfaced in the Settings > Providers section. */
const SUPPORTED_PROVIDER_IDS = [
  'opencode_go',
  'mistral',
  'google',
  'openrouter',
  'ollama',
  'openai',
] as const;

const i18n = defineMessages({
  title: {
    id: 'providersSection.title',
    defaultMessage: 'Model Providers',
  },
  description: {
    id: 'providersSection.description',
    defaultMessage:
      'Configure your AI model providers and load their available models directly from each provider API.',
  },
  loading: {
    id: 'providersSection.loading',
    defaultMessage: 'Loading providers...',
  },
  loadFailed: {
    id: 'providersSection.loadFailed',
    defaultMessage: 'Failed to load providers',
  },
  configure: {
    id: 'providersSection.configure',
    defaultMessage: 'Configure',
  },
  loadModels: {
    id: 'providersSection.loadModels',
    defaultMessage: 'Load Models',
  },
  reloadingModels: {
    id: 'providersSection.reloadingModels',
    defaultMessage: 'Reloading models...',
  },
  configured: {
    id: 'providersSection.configured',
    defaultMessage: 'Configured',
  },
  notConfigured: {
    id: 'providersSection.notConfigured',
    defaultMessage: 'Not configured',
  },
  modelsLoaded: {
    id: 'providersSection.modelsLoaded',
    defaultMessage: '{count} models loaded from {provider}',
  },
  modelsError: {
    id: 'providersSection.modelsError',
    defaultMessage: 'Could not load models from {provider}: {error}',
  },
  needsConfig: {
    id: 'providersSection.needsConfig',
    defaultMessage: 'Configure this provider first to load its models.',
  },
  setDefault: {
    id: 'providersSection.setDefault',
    defaultMessage: 'Click a model to use it as your default.',
  },
  defaultSet: {
    id: 'providersSection.defaultSet',
    defaultMessage: '{model} is now your default model.',
  },
  defaultSetFailed: {
    id: 'providersSection.defaultSetFailed',
    defaultMessage: 'Failed to set default model',
  },
  showModels: {
    id: 'providersSection.showModels',
    defaultMessage: 'Show models',
  },
  hideModels: {
    id: 'providersSection.hideModels',
    defaultMessage: 'Hide models',
  },
  manageAll: {
    id: 'providersSection.manageAll',
    defaultMessage: 'Manage all providers',
  },
});

interface ProvidersSectionProps {
  setView: (view: View) => void;
}

export default function ProvidersSection({ setView }: ProvidersSectionProps) {
  const intl = useIntl();
  const [providers, setProviders] = useState<ProviderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<ProviderDetails | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [modelErrors, setModelErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sortProviders = useCallback((list: ProviderDetails[]) => {
    const rank = (id: string) => {
      const index = (SUPPORTED_PROVIDER_IDS as readonly string[]).indexOf(id);
      return index === -1 ? SUPPORTED_PROVIDER_IDS.length : index;
    };
    return [...list].sort((a, b) => rank(a.name) - rank(b.name));
  }, []);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all = await acpListSettingsProviderDetails();
      setProviders(
        sortProviders(
          all.filter((p) => (SUPPORTED_PROVIDER_IDS as readonly string[]).includes(p.name))
        )
      );
    } catch (error) {
      console.error('Failed to load providers:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [sortProviders]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const upsertProvider = useCallback((updated: ProviderDetails) => {
    setProviders((prev) =>
      prev.some((p) => p.name === updated.name)
        ? prev.map((p) => (p.name === updated.name ? updated : p))
        : prev
    );
  }, []);

  const handleLoadModels = useCallback(
    async (provider: ProviderDetails) => {
      setRefreshingId(provider.name);
      setModelErrors((prev) => {
        const next = { ...prev };
        delete next[provider.name];
        return next;
      });
      try {
        const { provider: updated, readinessError } = await acpRefreshProviderDetails(
          provider.name
        );
        upsertProvider(updated);
        const error = readinessError ?? updated.last_refresh_error ?? null;
        if (error) {
          setModelErrors((prev) => ({ ...prev, [provider.name]: error }));
          return;
        }
        const count = updated.metadata.known_models.length;
        setExpanded((prev) => ({ ...prev, [provider.name]: true }));
        toastSuccess({
          title: intl.formatMessage(i18n.modelsLoaded, {
            count,
            provider: updated.metadata.display_name,
          }),
          msg: '',
        });
      } catch (error) {
        console.error(`Failed to load models for ${provider.name}:`, error);
        setModelErrors((prev) => ({
          ...prev,
          [provider.name]: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        setRefreshingId(null);
      }
    },
    [intl, upsertProvider]
  );

  const handleSetDefaultModel = useCallback(
    async (provider: ProviderDetails, model: string) => {
      try {
        await acpSaveDefaults(provider.name, model);
        toastSuccess({
          title: intl.formatMessage(i18n.defaultSet, {
            model,
            provider: provider.metadata.display_name,
          }),
          msg: '',
        });
      } catch (error) {
        console.error('Failed to set default model:', error);
        toastError({
          title: intl.formatMessage(i18n.defaultSetFailed),
          msg: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [intl]
  );

  const onProviderConfigured = useCallback(
    async (provider: ProviderDetails) => {
      setConfiguring(null);
      await loadProviders();
      // Refresh the model inventory once configuration is saved
      handleLoadModels(provider);
    },
    [loadProviders, handleLoadModels]
  );

  const cards = useMemo(
    () =>
      providers.map((provider) => {
        const models = provider.metadata.known_models;
        const isRefreshing = refreshingId === provider.name;
        const isOpen = expanded[provider.name] ?? false;
        const error = modelErrors[provider.name];
        return (
          <Card key={provider.name} data-testid={`providers-section-${provider.name}`}>
            <CardContent className="px-2 pt-2">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-text-primary">{provider.metadata.display_name}</h3>
                    {provider.is_configured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {intl.formatMessage(i18n.configured)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">
                        {intl.formatMessage(i18n.notConfigured)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-text-secondary">
                    {provider.metadata.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfiguring(provider)}
                      data-testid={`providers-configure-${provider.name}`}
                    >
                      <Settings2 className="mr-1 h-4 w-4" />
                      {intl.formatMessage(i18n.configure)}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isRefreshing}
                      onClick={() => handleLoadModels(provider)}
                      data-testid={`providers-load-models-${provider.name}`}
                    >
                      {isRefreshing ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-4 w-4" />
                      )}
                      {isRefreshing
                        ? intl.formatMessage(i18n.reloadingModels)
                        : intl.formatMessage(i18n.loadModels)}
                    </Button>
                    {models.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [provider.name]: !isOpen }))
                        }
                      >
                        {isOpen ? (
                          <ChevronUp className="mr-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="mr-1 h-4 w-4" />
                        )}
                        {isOpen
                          ? intl.formatMessage(i18n.hideModels)
                          : intl.formatMessage(i18n.showModels)}
                      </Button>
                    )}
                  </div>

                  {error && (
                    <p className="mt-2 text-xs text-red-500">
                      {intl.formatMessage(i18n.modelsError, {
                        provider: provider.metadata.display_name,
                        error,
                      })}
                    </p>
                  )}

                  {!error && !provider.is_configured && models.length === 0 && (
                    <p className="mt-2 text-xs text-text-secondary">
                      {intl.formatMessage(i18n.needsConfig)}
                    </p>
                  )}

                  {isOpen && (
                    <div className="mt-3 rounded-lg border border-border-primary p-3">
                      <p className="mb-2 text-xs text-text-secondary">
                        {intl.formatMessage(i18n.modelsLoaded, {
                          count: models.length,
                          provider: provider.metadata.display_name,
                        })}{' '}
                        {intl.formatMessage(i18n.setDefault)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {models.map((model) => (
                          <button
                            key={model.name}
                            type="button"
                            onClick={() => handleSetDefaultModel(provider, model.name)}
                            title={
                              model.context_limit
                                ? `${model.name} (${Math.round(model.context_limit / 1024)}k context)`
                                : model.name
                            }
                            className="rounded-full border border-border-primary bg-background-secondary px-2.5 py-1 text-xs text-text-primary transition-colors hover:border-border-secondary hover:bg-background-tertiary"
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }),
    [providers, refreshingId, expanded, modelErrors, intl, handleLoadModels, handleSetDefaultModel]
  );

  return (
    <section id="providers" className="space-y-4 pr-4">
      <Card className="p-2 pb-4">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <Button size="sm" variant="link" onClick={() => setView('ConfigureProviders')}>
            {intl.formatMessage(i18n.manageAll)}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {intl.formatMessage(i18n.loading)}
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-500">
          {intl.formatMessage(i18n.loadFailed)}: {loadError}
        </p>
      ) : (
        <div className="space-y-4">{cards}</div>
      )}

      {configuring && (
        <ProviderConfigurationModal
          provider={configuring}
          onClose={() => setConfiguring(null)}
          onConfigured={onProviderConfigured}
        />
      )}
    </section>
  );
}
