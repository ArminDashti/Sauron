import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2, Settings2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ProviderConfigurationModal from '../providers/modal/ProviderConfigurationModal';
import { acpListProviderDetails, acpListSetupCatalog } from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import type { ProviderSetupCatalogEntryDto } from '@aaif/sauron-acp-client';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  title: {
    id: 'harnessesSection.title',
    defaultMessage: 'Agent Harnesses',
  },
  description: {
    id: 'harnessesSection.description',
    defaultMessage:
      'Use agents from another harness such as Cursor, Claude Code, Codex, or Copilot. Enable one here, then select it in Models to chat with it.',
  },
  loading: {
    id: 'harnessesSection.loading',
    defaultMessage: 'Loading harnesses...',
  },
  loadFailed: {
    id: 'harnessesSection.loadFailed',
    defaultMessage: 'Failed to load harnesses',
  },
  empty: {
    id: 'harnessesSection.empty',
    defaultMessage: 'No external agent harnesses are available.',
  },
  installed: {
    id: 'harnessesSection.installed',
    defaultMessage: 'Installed',
  },
  notInstalled: {
    id: 'harnessesSection.notInstalled',
    defaultMessage: 'Not installed',
  },
  configure: {
    id: 'harnessesSection.configure',
    defaultMessage: 'Configure',
  },
  configured: {
    id: 'harnessesSection.configured',
    defaultMessage: 'Enabled',
  },
  notConfigured: {
    id: 'harnessesSection.notConfigured',
    defaultMessage: 'Not enabled',
  },
});

type Harness = {
  catalog: ProviderSetupCatalogEntryDto;
  details: ProviderDetails | null;
};

interface HarnessesSectionProps {
  onConfigured?: () => void;
}

export default function HarnessesSection({ onConfigured }: HarnessesSectionProps) {
  const intl = useIntl();
  const [harnesses, setHarnesses] = useState<Harness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<ProviderDetails | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, details] = await Promise.all([
        acpListSetupCatalog(),
        acpListProviderDetails(),
      ]);
      const detailsById = new Map(details.map((provider) => [provider.name, provider]));
      setHarnesses(
        catalog
          // The built-in goose harness is always available; this section is for
          // harnesses that come from other tools such as Cursor or Claude Code.
          .filter(
            (entry) =>
              entry.category === 'agent' &&
              entry.providerId !== 'goose' &&
              // Optional harnesses only appear once their CLI is installed.
              (!entry.showOnlyWhenInstalled || detailsById.get(entry.providerId)?.is_available)
          )
          .map((entry) => ({
            catalog: entry,
            details: detailsById.get(entry.providerId) ?? null,
          }))
      );
    } catch (error) {
      console.error('Failed to load agent harnesses:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfigured = useCallback(
    (provider: ProviderDetails) => {
      setConfiguring(null);
      void load();
      onConfigured?.();
      // Keep the card responsive while the backend refreshes the inventory.
      setHarnesses((previous) =>
        previous.map((harness) =>
          harness.catalog.providerId === provider.name ? { ...harness, details: provider } : harness
        )
      );
    },
    [load, onConfigured]
  );

  return (
    <section id="harnesses" className="space-y-4 pr-4">
      <Card className="p-2 pb-4">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
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
      ) : harnesses.length === 0 ? (
        <p className="text-sm text-text-secondary">{intl.formatMessage(i18n.empty)}</p>
      ) : (
        <div className="space-y-4">
          {harnesses.map(({ catalog, details }) => {
            const isConfigured = details?.is_configured ?? false;
            const isInstalled = details?.is_available ?? false;
            return (
              <Card key={catalog.providerId} data-testid={`harness-${catalog.providerId}`}>
                <CardContent className="px-2 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-text-primary">{catalog.name}</h3>
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {intl.formatMessage(i18n.configured)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">
                        {intl.formatMessage(i18n.notConfigured)}
                      </span>
                    )}
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">
                        {intl.formatMessage(i18n.installed)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                        <CircleAlert className="h-3 w-3" />
                        {intl.formatMessage(i18n.notInstalled)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{catalog.description}</p>
                  {details && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfiguring(details)}
                        data-testid={`harness-configure-${catalog.providerId}`}
                      >
                        <Settings2 className="mr-1 h-4 w-4" />
                        {intl.formatMessage(i18n.configure)}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {configuring && (
        <ProviderConfigurationModal
          provider={configuring}
          onClose={() => setConfiguring(null)}
          onConfigured={handleConfigured}
        />
      )}
    </section>
  );
}
