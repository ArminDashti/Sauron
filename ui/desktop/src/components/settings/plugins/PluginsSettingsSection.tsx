import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Package, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { listSkillSources } from '../../../acp/sources';
import { getInitialWorkingDir } from '../../../utils/workingDir';
import { errorMessage } from '../../../utils/conversionUtils';
import { defineMessages, useIntl } from '../../../i18n';
import type { View } from '../../../utils/navigationUtils';
import type { SourceEntry } from '@aaif/goose-acp-client';

const i18n = defineMessages({
  title: {
    id: 'pluginsSettings.title',
    defaultMessage: 'Plugins',
  },
  description: {
    id: 'pluginsSettings.description',
    defaultMessage:
      'Plugins installed under .agents/plugins contribute skills and MCP servers to goose. Manage the skills they provide from the Skills view.',
  },
  loading: {
    id: 'pluginsSettings.loading',
    defaultMessage: 'Loading plugins...',
  },
  loadFailed: {
    id: 'pluginsSettings.loadFailed',
    defaultMessage: 'Could not load plugins',
  },
  empty: {
    id: 'pluginsSettings.empty',
    defaultMessage: 'No plugins installed.',
  },
  emptyHint: {
    id: 'pluginsSettings.emptyHint',
    defaultMessage:
      'Install a plugin with `goose plugin install` and it will show up here.',
  },
  pluginCount: {
    id: 'pluginsSettings.pluginCount',
    defaultMessage: '{count, plural, =0 {No plugins} one {# plugin} other {# plugins}}',
  },
  skillCount: {
    id: 'pluginsSettings.skillCount',
    defaultMessage: '{count, plural, one {# skill} other {# skills}}',
  },
  refresh: {
    id: 'pluginsSettings.refresh',
    defaultMessage: 'Refresh',
  },
  manageSkills: {
    id: 'pluginsSettings.manageSkills',
    defaultMessage: 'Manage skills',
  },
});

/** Plugin skills live under a `.agents/plugins/<plugin>/` directory. */
function pluginNameFromPath(path: string): string | null {
  const segments = path.split(/[\\/]/).filter(Boolean);
  const pluginsIndex = segments.lastIndexOf('plugins');
  if (pluginsIndex < 1 || segments[pluginsIndex - 1] !== '.agents') {
    return null;
  }
  return segments[pluginsIndex + 1] ?? null;
}

interface PluginsSettingsSectionProps {
  setView: (view: View) => void;
}

export default function PluginsSettingsSection({ setView }: PluginsSettingsSectionProps) {
  const intl = useIntl();
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlugins = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSources(await listSkillSources(getInitialWorkingDir()));
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const plugins = useMemo(() => {
    const grouped = new Map<string, SourceEntry[]>();
    for (const source of sources) {
      const plugin = pluginNameFromPath(source.path);
      if (!plugin) continue;
      const entries = grouped.get(plugin);
      if (entries) {
        entries.push(source);
      } else {
        grouped.set(plugin, [source]);
      }
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sources]);

  return (
    <section id="plugins" className="space-y-4 pr-4">
      <Card className="p-2 pb-4">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 px-2">
          <span className="text-xs text-text-secondary">
            {intl.formatMessage(i18n.pluginCount, { count: plugins.length })}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={loadPlugins} disabled={isLoading}>
              <RefreshCw
                className={`mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {intl.formatMessage(i18n.refresh)}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setView('skills')}>
              {intl.formatMessage(i18n.manageSkills)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : loadError ? (
        <p className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {intl.formatMessage(i18n.loadFailed)}: {loadError}
        </p>
      ) : plugins.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 px-4 py-4">
            <Package className="mt-0.5 h-5 w-5 text-text-secondary" aria-hidden="true" />
            <div>
              <p className="text-sm text-text-primary">{intl.formatMessage(i18n.empty)}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {intl.formatMessage(i18n.emptyHint)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        plugins.map(([plugin, skills]) => (
          <Card key={plugin} className="rounded-lg" data-testid={`plugins-section-${plugin}`}>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                {plugin}
              </CardTitle>
              <CardDescription>
                {intl.formatMessage(i18n.skillCount, { count: skills.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill.path}
                    title={skill.description || skill.path}
                    className="rounded-full border border-border-primary bg-background-secondary px-2.5 py-1 text-xs text-text-primary"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
