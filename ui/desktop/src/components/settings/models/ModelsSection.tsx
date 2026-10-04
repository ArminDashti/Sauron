import { useEffect, useState } from 'react';
import AllProviderModels from './AllProviderModels';
import { defineMessages, useIntl } from '../../../i18n';
import type { RecentModel } from '../../../utils/settings';

const sectionMessages = defineMessages({
  modelsHeading: {
    id: 'modelsSection.modelsHeading',
    defaultMessage: 'Models',
  },
});

export default function ModelsSection() {
  const intl = useIntl();
  const [preferredModels, setPreferredModels] = useState<RecentModel[]>([]);

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

  return (
    <section id="models" className="space-y-6 pr-4">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">
          {intl.formatMessage(sectionMessages.modelsHeading)}
        </h2>
        <AllProviderModels
          preferredModels={preferredModels}
          onPreferredModelsChange={setPreferredModels}
        />
      </div>
    </section>
  );
}
