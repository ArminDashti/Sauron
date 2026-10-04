import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw, Wrench } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Select } from '../../ui/Select';
import { BrandIcon } from '../../logos/BrandLogos';
import ProviderConfigurationModal from './modal/ProviderConfigurationModal';
import DefaultProviderSetupForm, {
  type ConfigInput,
} from './modal/subcomponents/forms/DefaultProviderSetupForm';
import { providerConfigSubmitHandler } from './modal/subcomponents/handlers/DefaultSubmitHandler';
import ResetProviderSection from '../reset_provider/ResetProviderSection';
import {
  acpListSettingsProviderDetails,
  acpRefreshProviderDetails,
  acpSaveDefaults,
} from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import type { View } from '../../../utils/navigationUtils';
import { defineMessages, useIntl } from '../../../i18n';
import { toastError, toastSuccess } from '../../../toasts';
import { useFeatures } from '../../../contexts/FeaturesContext';
import LocalInferenceSection from '../localInference/LocalInferenceSection';
import ModelsSection from '../models/ModelsSection';
import { filterSupportedProviders } from '../../../utils/supportedProviders';

const i18n = defineMessages({
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
  selectProvider: {
    id: 'providersSection.selectProvider',
    defaultMessage: 'Select a provider',
  },
  requiredParameter: {
    id: 'providerConfigurationModal.parameterRequired',
    defaultMessage: '{paramName} is required',
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
  resetTitle: {
    id: 'providersSection.resetTitle',
    defaultMessage: 'Reset Provider and Model',
  },
  resetDescription: {
    id: 'providersSection.resetDescription',
    defaultMessage: 'Clear your selected model and provider settings to start fresh',
  },
});

interface ProvidersSectionProps {
  setView: (view: View) => void;
}

interface ProviderOption {
  value: string;
  label: string;
  provider: ProviderDetails;
}

interface ProviderConfigurationFieldsProps {
  provider: ProviderDetails;
  onConfigured: (provider: ProviderDetails) => Promise<void>;
}

function ProviderConfigurationFields({ provider, onConfigured }: ProviderConfigurationFieldsProps) {
  const intl = useIntl();
  const [configValues, setConfigValues] = useState<Record<string, ConfigInput>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const configKeys = useMemo(
    () => provider.metadata.config_keys.filter((key) => !key.oauth_flow),
    [provider.metadata.config_keys]
  );
  const configuredProvider = useMemo(
    () => ({ ...provider, metadata: { ...provider.metadata, config_keys: configKeys } }),
    [provider, configKeys]
  );

  if (configKeys.length === 0) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);

    const errors: Record<string, string> = {};
    for (const key of configKeys) {
      const entry = configValues[key.name];
      if (key.required && !entry?.value && !entry?.serverValue) {
        errors[key.name] = intl.formatMessage(i18n.requiredParameter, {
          paramName: key.name,
        });
      }
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const values = Object.fromEntries(
      Object.entries(configValues)
        .filter(([, entry]) => !!entry.value || typeof entry.serverValue === 'string')
        .map(([key, entry]) => [
          key,
          entry.value ?? (typeof entry.serverValue === 'string' ? entry.serverValue : ''),
        ])
    );

    setSaving(true);
    try {
      await providerConfigSubmitHandler(configuredProvider, values);
      await onConfigured(provider);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
      <DefaultProviderSetupForm
        configValues={configValues}
        setConfigValues={setConfigValues}
        provider={configuredProvider}
        validationErrors={validationErrors}
      />
      {saveError && (
        <p role="alert" className="text-sm text-red-500">
          {saveError}
        </p>
      )}
      <Button type="submit" size="sm" disabled={saving}>
        {intl.formatMessage({ id: 'providerSetupActions.submit', defaultMessage: 'Submit' })}
      </Button>
    </form>
  );
}

export default function ProvidersSection({ setView }: ProvidersSectionProps) {
  const intl = useIntl();
  const { localInference } = useFeatures();
  const [providers, setProviders] = useState<ProviderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<ProviderDetails | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all = await acpListSettingsProviderDetails();
      const list = filterSupportedProviders(all).sort((a, b) =>
        a.metadata.display_name.localeCompare(b.metadata.display_name, undefined, {
          sensitivity: 'base',
        })
      );
      setProviders(list);
      setSelectedName((current) => {
        if (current && list.some((p) => p.name === current)) return current;
        return list[0]?.name ?? null;
      });
    } catch (error) {
      console.error('Failed to load providers:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.name === selectedName) ?? null,
    [providers, selectedName]
  );

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
      setModelError(null);
      try {
        const { provider: updated, readinessError } = await acpRefreshProviderDetails(
          provider.name
        );
        upsertProvider(updated);
        const error = readinessError ?? updated.last_refresh_error ?? null;
        if (error) {
          setModelError(error);
          return;
        }
        const count = updated.metadata.known_models.length;
        setShowModels(true);
        toastSuccess({
          title: intl.formatMessage(i18n.modelsLoaded, {
            count,
            provider: updated.metadata.display_name,
          }),
          msg: '',
        });
      } catch (error) {
        console.error(`Failed to load models for ${provider.name}:`, error);
        setModelError(error instanceof Error ? error.message : String(error));
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

  const options = useMemo(
    () =>
      [...providers]
        .sort((a, b) =>
          a.metadata.display_name.localeCompare(b.metadata.display_name, undefined, {
            sensitivity: 'base',
          })
        )
        .map((provider) => ({
          value: provider.name,
          label: provider.metadata.display_name,
          provider,
        })),
    [providers]
  );

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedName) ?? null,
    [options, selectedName]
  );

  const statusBadge = useCallback(
    (isConfigured: boolean) =>
      isConfigured ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          {intl.formatMessage(i18n.configured)}
        </span>
      ) : (
        <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">
          {intl.formatMessage(i18n.notConfigured)}
        </span>
      ),
    [intl]
  );

  // Same layout for the closed control and each option so the trigger matches
  // what the user picked from the list.
  const renderOptionLabel = useCallback(
    (option: ProviderOption) => (
      <div className="flex items-center gap-2">
        <BrandIcon provider={option.value} className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-text-primary">{option.label}</span>
        {statusBadge(option.provider.is_configured)}
      </div>
    ),
    [statusBadge]
  );

  const handleProviderChange = useCallback((option: ProviderOption | null) => {
    setSelectedName(option?.value ?? null);
    setModelError(null);
    setShowModels(false);
  }, []);

  const models = selectedProvider?.metadata.known_models ?? [];
  const isRefreshing = selectedProvider ? refreshingId === selectedProvider.name : false;

  return (
    <section id="providers" className="space-y-4 pr-4">
      <div className="flex justify-end">
        <Button size="sm" variant="link" onClick={() => setView('ConfigureProviders')}>
          {intl.formatMessage(i18n.manageAll)}
        </Button>
      </div>

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
        <Card data-testid="providers-section">
          <CardContent className="px-2 pt-2">
            <Select
              inputId="providers-section-select"
              options={options}
              value={selectedOption}
              onChange={(option) => handleProviderChange(option as ProviderOption | null)}
              placeholder={intl.formatMessage(i18n.selectProvider)}
              formatOptionLabel={(option: unknown) => renderOptionLabel(option as ProviderOption)}
            />

            {selectedProvider && (
              <div className="mt-4">
                <p className="text-xs text-text-secondary">
                  {selectedProvider.metadata.description}
                </p>

                <ProviderConfigurationFields
                  key={selectedProvider.name}
                  provider={selectedProvider}
                  onConfigured={onProviderConfigured}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfiguring(selectedProvider)}
                    data-testid={`providers-configure-${selectedProvider.name}`}
                  >
                    <Wrench className="mr-1 h-4 w-4" />
                    {intl.formatMessage(i18n.configure)}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isRefreshing}
                    onClick={() => handleLoadModels(selectedProvider)}
                    data-testid={`providers-load-models-${selectedProvider.name}`}
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
                    <Button size="sm" variant="ghost" onClick={() => setShowModels((v) => !v)}>
                      {showModels ? (
                        <ChevronUp className="mr-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-1 h-4 w-4" />
                      )}
                      {showModels
                        ? intl.formatMessage(i18n.hideModels)
                        : intl.formatMessage(i18n.showModels)}
                    </Button>
                  )}
                </div>

                {modelError && (
                  <p className="mt-2 text-xs text-red-500">
                    {intl.formatMessage(i18n.modelsError, {
                      provider: selectedProvider.metadata.display_name,
                      error: modelError,
                    })}
                  </p>
                )}

                {!modelError && !selectedProvider.is_configured && models.length === 0 && (
                  <p className="mt-2 text-xs text-text-secondary">
                    {intl.formatMessage(i18n.needsConfig)}
                  </p>
                )}

                {showModels && models.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border-primary p-3">
                    <p className="mb-2 text-xs text-text-secondary">
                      {intl.formatMessage(i18n.modelsLoaded, {
                        count: models.length,
                        provider: selectedProvider.metadata.display_name,
                      })}{' '}
                      {intl.formatMessage(i18n.setDefault)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {models.map((model) => (
                        <button
                          key={model.name}
                          type="button"
                          onClick={() => handleSetDefaultModel(selectedProvider, model.name)}
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
            )}
          </CardContent>
        </Card>
      )}

      {localInference && <LocalInferenceSection />}

      <ModelsSection />

      <Card className="pb-2 rounded-lg">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.resetTitle)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.resetDescription)}</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <ResetProviderSection setView={setView} />
        </CardContent>
      </Card>

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
