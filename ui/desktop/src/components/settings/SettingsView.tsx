import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { View, ViewOptions } from '../../utils/navigationUtils';
import ProvidersSection from './providers/ProvidersSection';
import ExternalBackendSection from './app/ExternalBackendSection';
import AgentLoopSettings from './AgentLoopSettings';
import AppSettingsSection from './app/AppSettingsSection';
import AppearanceSettingsSection from './appearance/AppearanceSettingsSection';
import McpSettingsSection from './mcp/McpSettingsSection';
import PluginsSettingsSection from './plugins/PluginsSettingsSection';
import ConfigSettings from './config/ConfigSettings';
import PromptsSettingsSection from './PromptsSettingsSection';
import type { ExtensionConfig } from '../../types/extensions';
import { Bot, FileText, Monitor, Palette, Plug, Puzzle, Server, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ChatSettingsSection from './chat/ChatSettingsSection';
import KeyboardShortcutsSection from './keyboard/KeyboardShortcutsSection';
import HarnessesSection from './harnesses/HarnessesSection';
import SkillsSection from './skills/SkillsSection';
import { CONFIGURATION_ENABLED, PROMPTS_SETTINGS_ENABLED } from '../../updates';
import { trackSettingsTabViewed } from '../../utils/analytics';
import { defineMessages, useIntl } from '../../i18n';
import BackButton from '../ui/BackButton';
import { useNavigationContext } from '../Layout/NavigationContext';
import { cn } from '../../utils';

const i18n = defineMessages({
  title: {
    id: 'settingsView.title',
    defaultMessage: 'Settings',
  },
  tabProviders: {
    id: 'settingsView.tabProviders',
    defaultMessage: 'Providers',
  },
  tabAgent: {
    id: 'settingsView.tabExternalBackend',
    defaultMessage: 'Agent',
  },
  tabSkills: {
    id: 'settingsView.tabSkills',
    defaultMessage: 'Skills',
  },
  tabPrompts: {
    id: 'settingsView.tabPrompts',
    defaultMessage: 'Prompts',
  },
  tabMcp: {
    id: 'settingsView.tabMcp',
    defaultMessage: 'MCP',
  },
  tabPlugins: {
    id: 'settingsView.tabPlugins',
    defaultMessage: 'Plugins',
  },
  tabAppearance: {
    id: 'settingsView.tabAppearance',
    defaultMessage: 'Appearance',
  },
  tabApp: {
    id: 'settingsView.tabApp',
    defaultMessage: 'App',
  },
});

const settingsTabClass =
  'w-full gap-3 rounded-full px-3 py-2 text-sm font-medium text-text-primary/80 hover:bg-background-tertiary/60 hover:text-text-primary data-[state=active]:bg-background-tertiary data-[state=active]:text-text-primary data-[state=active]:shadow-none';

export type SettingsViewOptions = {
  deepLinkConfig?: ExtensionConfig;
  showEnvVars?: boolean;
  section?: string;
};

export default function SettingsView({
  onClose,
  setView,
  viewOptions,
}: {
  onClose: () => void;
  setView: (view: View, viewOptions?: ViewOptions) => void;
  viewOptions: SettingsViewOptions;
}) {
  const [activeTab, setActiveTab] = useState('appearance');
  const hasTrackedInitialTab = useRef(false);
  const { navWidth } = useNavigationContext();
  const intl = useIntl();
  const safeIsMacOS = (window?.electron?.platform || 'darwin') === 'darwin';

  const activeTabTitles: Record<string, string> = {
    appearance: intl.formatMessage(i18n.tabAppearance),
    providers: intl.formatMessage(i18n.tabProviders),
    agent: intl.formatMessage(i18n.tabAgent),
    skills: intl.formatMessage(i18n.tabSkills),
    mcp: intl.formatMessage(i18n.tabMcp),
    plugins: intl.formatMessage(i18n.tabPlugins),
    app: intl.formatMessage(i18n.tabApp),
  };

  if (PROMPTS_SETTINGS_ENABLED) {
    activeTabTitles.prompts = intl.formatMessage(i18n.tabPrompts);
  }

  const activeTabTitle = activeTabTitles[activeTab];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackSettingsTabViewed(tab);
  };

  // Determine initial tab based on section prop
  useEffect(() => {
    if (viewOptions.section) {
      // Sections merged into another tab resolve to the tab that now owns them.
      const sectionToTab: Record<string, string> = {
        update: 'app',
        app: 'app',
        keyboard: 'app',
        providers: 'providers',
        models: 'providers',
        'local-inference': 'providers',
        agent: 'agent',
        sharing: 'agent',
        harnesses: 'agent',
        appearance: 'appearance',
        theme: 'appearance',
        language: 'appearance',
        chat: 'appearance',
        modes: 'appearance',
        styles: 'appearance',
        tools: 'appearance',
        skills: 'skills',
        mcp: 'mcp',
        plugins: 'plugins',
      };

      if (PROMPTS_SETTINGS_ENABLED) {
        sectionToTab.prompts = 'prompts';
      }

      const targetTab = sectionToTab[viewOptions.section];
      if (targetTab) {
        setActiveTab(targetTab);
      }
    }
  }, [viewOptions.section]);

  useEffect(() => {
    if (!hasTrackedInitialTab.current) {
      trackSettingsTabViewed(activeTab);
      hasTrackedInitialTab.current = true;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="absolute inset-0 animate-fade-in bg-background-primary">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation="vertical"
        className="h-full min-h-0 w-full flex-row rounded-none"
      >
        <div className="h-full flex-shrink-0 p-2" style={{ width: navWidth }}>
          <aside
            aria-label={intl.formatMessage(i18n.title)}
            className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border-primary bg-background-primary"
          >
            {/* Back sits in the top band so it is the first control in the
                sidebar; the left inset keeps it clear of the macOS window
                controls that share this strip. */}
            <div
              className={cn(
                'flex h-[48px] flex-shrink-0 items-center pr-2 no-drag',
                safeIsMacOS ? 'pl-[88px]' : 'pl-2'
              )}
            >
              <BackButton
                onClick={onClose}
                variant="ghost"
                className="w-full justify-start rounded-full px-3 text-sm font-medium hover:bg-background-tertiary/60"
              />
            </div>
            <TabsList className="w-full min-h-0 flex-1 flex-col items-stretch gap-0.5 overflow-y-auto bg-transparent px-2 py-0">
              <TabsTrigger
                value="appearance"
                className={settingsTabClass}
                data-testid="settings-appearance-tab"
              >
                <Palette className="h-5 w-5" />
                {intl.formatMessage(i18n.tabAppearance)}
              </TabsTrigger>
              <TabsTrigger
                value="providers"
                className={settingsTabClass}
                data-testid="settings-providers-tab"
              >
                <Server className="h-5 w-5" />
                {intl.formatMessage(i18n.tabProviders)}
              </TabsTrigger>
              <TabsTrigger
                value="agent"
                className={settingsTabClass}
                data-testid="settings-agent-tab"
              >
                <Bot className="h-5 w-5" />
                {intl.formatMessage(i18n.tabAgent)}
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className={settingsTabClass}
                data-testid="settings-skills-tab"
              >
                <Zap className="h-5 w-5" />
                {intl.formatMessage(i18n.tabSkills)}
              </TabsTrigger>
              <TabsTrigger value="mcp" className={settingsTabClass} data-testid="settings-mcp-tab">
                <Plug className="h-5 w-5" />
                {intl.formatMessage(i18n.tabMcp)}
              </TabsTrigger>
              <TabsTrigger
                value="plugins"
                className={settingsTabClass}
                data-testid="settings-plugins-tab"
              >
                <Puzzle className="h-5 w-5" />
                {intl.formatMessage(i18n.tabPlugins)}
              </TabsTrigger>
              <TabsTrigger value="app" className={settingsTabClass} data-testid="settings-app-tab">
                <Monitor className="h-5 w-5" />
                {intl.formatMessage(i18n.tabApp)}
              </TabsTrigger>
              {PROMPTS_SETTINGS_ENABLED && (
                <TabsTrigger
                  value="prompts"
                  className={settingsTabClass}
                  data-testid="settings-prompts-tab"
                >
                  <FileText className="h-5 w-5" />
                  {intl.formatMessage(i18n.tabPrompts)}
                </TabsTrigger>
              )}
            </TabsList>
          </aside>
        </div>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background-primary">
          <div className="px-12 pb-8 pt-16">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-4xl font-light">{activeTabTitle}</h1>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-12">
            <div className="mx-auto max-w-5xl pb-10">
              <TabsContent
                value="appearance"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="space-y-4">
                  <AppearanceSettingsSection />
                  <ChatSettingsSection />
                </div>
              </TabsContent>

              <TabsContent
                value="providers"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ProvidersSection setView={setView} />
              </TabsContent>

              <TabsContent
                value="agent"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="space-y-4">
                  <AgentLoopSettings />
                  <ExternalBackendSection />
                  <HarnessesSection />
                </div>
              </TabsContent>

              <TabsContent
                value="skills"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <SkillsSection />
              </TabsContent>

              <TabsContent
                value="mcp"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <McpSettingsSection />
              </TabsContent>

              <TabsContent
                value="plugins"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <PluginsSettingsSection setView={setView} />
              </TabsContent>

              <TabsContent
                value="app"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="space-y-8">
                  {CONFIGURATION_ENABLED && <ConfigSettings />}
                  <AppSettingsSection scrollToSection={viewOptions.section} />
                  <KeyboardShortcutsSection />
                </div>
              </TabsContent>

              {PROMPTS_SETTINGS_ENABLED && (
                <TabsContent
                  value="prompts"
                  className="mt-0 focus-visible:outline-none focus-visible:ring-0"
                >
                  <PromptsSettingsSection />
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </main>
      </Tabs>
    </div>
  );
}
