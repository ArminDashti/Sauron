import { useCallback, useEffect, useRef, useState } from 'react';
import ModelSettingsButtons from './subcomponents/ModelSettingsButtons';
import AllProviderModels from './AllProviderModels';
import PreferredModels from './PreferredModels';
import ProviderLogo from '../providers/modal/subcomponents/ProviderLogo';
import { ContextBadge, DefaultBadge, ReasoningBadge } from './subcomponents/ModelBadges';
import { Skeleton } from '../../ui/skeleton';
import { acpGetProviderDetails, acpReadDefaults } from '../../../acp/providers';
import type { ModelInfo, ProviderDetails } from '../../../types/providers';
import { modelAndProviderMessages, useModelAndProvider } from '../../ModelAndProviderContext';
import { toastError } from '../../../toasts';
import type { RecentModel } from '../../../utils/settings';

import { Card, CardContent } from '../../ui/card';
import { useIntl } from '../../../i18n';
import type { View } from '../../../utils/navigationUtils';

interface ModelsSectionProps {
  setView: (view: View) => void;
}

export default function ModelsSection({ setView }: ModelsSectionProps) {
  const intl = useIntl();
  const [defaults, setDefaults] = useState<{ providerId: string | null; modelId: string | null }>({
    providerId: null,
    modelId: null,
  });
  const [provider, setProvider] = useState<string>('');
  const [displayModelName, setDisplayModelName] = useState<string>('');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [preferredModels, setPreferredModels] = useState<RecentModel[]>([]);
  const {
    getCurrentModelDisplayName,
    getCurrentProviderDisplayName,
    currentModel,
    currentProvider,
  } = useModelAndProvider();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = (await window.electron.getSetting('preferredModels')) ?? [];
        if (!cancelled) setPreferredModels(stored);
      } catch (error) {
        console.error('Error loading preferred models:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadModelData = useCallback(async () => {
    try {
      setIsLoading(true);

      const currentDefaults = await acpReadDefaults();
      setDefaults(currentDefaults);

      // Model metadata (context window, reasoning) for the info badges
      let details: ProviderDetails | null = null;
      if (currentDefaults.providerId) {
        try {
          details = await acpGetProviderDetails(currentDefaults.providerId);
          setModelInfo(
            details.metadata.known_models.find((m) => m.name === currentDefaults.modelId) ?? null
          );
        } catch {
          setModelInfo(null);
        }
      } else {
        setModelInfo(null);
      }

      // Get display name (alias if available, otherwise model name)
      const modelDisplayName = await getCurrentModelDisplayName();
      setDisplayModelName(modelDisplayName);

      // Get provider display name (subtext if available from predefined models, otherwise provider metadata)
      const providerDisplayName = await getCurrentProviderDisplayName();
      if (providerDisplayName) {
        setProvider(providerDisplayName);
      } else if (details) {
        setProvider(details.metadata.display_name);
      } else if (!currentDefaults.providerId) {
        setProvider('');
      } else {
        // Provider lookup failed entirely
        toastError({
          title: intl.formatMessage(modelAndProviderMessages.unknownProviderTitle),
          msg: intl.formatMessage(modelAndProviderMessages.unknownProviderMsg),
        });
        setProvider(currentDefaults.providerId);
      }
    } catch (error) {
      console.error('Error loading model data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentModelDisplayName, getCurrentProviderDisplayName, intl]);

  useEffect(() => {
    loadModelData();
  }, [loadModelData]);

  // Update display when model or provider changes - but only if they actually changed
  const prevModelRef = useRef<string | null>(null);
  const prevProviderRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      currentModel &&
      currentProvider &&
      (currentModel !== prevModelRef.current || currentProvider !== prevProviderRef.current)
    ) {
      prevModelRef.current = currentModel;
      prevProviderRef.current = currentProvider;
      loadModelData();
    }
  }, [currentModel, currentProvider, loadModelData]);

  const hasModel = !isLoading && Boolean(defaults.modelId);

  return (
    <section id="models" className="space-y-4 pr-4">
      <Card className="rounded-lg">
        <CardContent className="px-4" data-testid="models-section-current">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                {defaults.providerId && (
                  <ProviderLogo providerName={defaults.providerId} size="sm" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-medium text-text-primary">
                      {displayModelName}
                    </h3>
                    {hasModel && <DefaultBadge />}
                  </div>
                  <p className="truncate text-sm text-text-secondary">{provider}</p>
                  {(modelInfo?.context_limit || modelInfo?.reasoning) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ContextBadge contextLimit={modelInfo?.context_limit} />
                      {modelInfo?.reasoning && <ReasoningBadge />}
                    </div>
                  )}
                </div>
              </div>
              <ModelSettingsButtons setView={setView} />
            </div>
          )}
        </CardContent>
      </Card>

      <PreferredModels
        preferredModels={preferredModels}
        onPreferredModelsChange={setPreferredModels}
      />

      <AllProviderModels
        preferredModels={preferredModels}
        onPreferredModelsChange={setPreferredModels}
      />
    </section>
  );
}
