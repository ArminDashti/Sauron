import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { View, ViewOptions } from '../../utils/navigationUtils';
import ModelsSection from './models/ModelsSection';
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
import {
  Bot,
  Share2,
  Monitor,
  MessageSquare,
  FileText,
  Keyboard,
  Palette,
  Plug,
  Puzzle,
  Search,
  Server,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { cn } from '../../utils';
import ChatSettingsSection from './chat/ChatSettingsSection';
import KeyboardShortcutsSection from './keyboard/KeyboardShortcutsSection';
import { CONFIGURATION_ENABLED } from '../../updates';
import { trackSettingsTabViewed } from '../../utils/analytics';
import { defineMessages, useIntl } from '../../i18n';
import BackButton from '../ui/BackButton';
import { useNavigationContext } from '../Layout/NavigationContext';
import { iconColor, type IconColorKey } from '../../theme/iconColors';

const i18n = defineMessages({
  title: {
    id: 'settingsView.title',
    defaultMessage: 'Settings',
  },
  tabModels: {
    id: 'settingsView.tabModels',
    defaultMessage: 'Models',
  },
  tabProviders: {
    id: 'settingsView.tabProviders',
    defaultMessage: 'Providers',
  },
  tabChat: {
    id: 'settingsView.tabChat',
    defaultMessage: 'Chat',
  },
  tabAgent: {
    id: 'settingsView.tabExternalBackend',
    defaultMessage: 'Agent',
  },
  tabPrompts: {
    id: 'settingsView.tabPrompts',
    defaultMessage: 'Prompts',
  },
  tabKeyboard: {
    id: 'settingsView.tabKeyboard',
    defaultMessage: 'Keyboard',
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
  searchPlaceholder: {
    id: 'settingsView.searchPlaceholder',
    defaultMessage: 'Search Settings',
  },
  noResults: {
    id: 'settingsView.noResults',
    defaultMessage: 'No results',
  },
});

type SettingsTab = {
  value: string;
  label: (typeof i18n)[keyof typeof i18n];
  icon: LucideIcon;
  /** Palette key so each destination keeps the same color as elsewhere in the app. */
  color: IconColorKey;
  testId: string;
  group: 1 | 2;
};

/** Sidebar entries grouped like the reference layout: agent config first, app config below. */
const SETTINGS_TABS: SettingsTab[] = [
  {
    value: 'models',
    label: i18n.tabModels,
    icon: Bot,
    color: 'models',
    testId: 'settings-models-tab',
    group: 1,
  },
  {
    value: 'providers',
    label: i18n.tabProviders,
    icon: Server,
    color: 'providers',
    testId: 'settings-providers-tab',
    group: 1,
  },
  {
    value: 'chat',
    label: i18n.tabChat,
    icon: MessageSquare,
    color: 'chat',
    testId: 'settings-chat-tab',
    group: 1,
  },
  {
    value: 'sharing',
    label: i18n.tabAgent,
    icon: Share2,
    color: 'sharing',
    testId: 'settings-sharing-tab',
    group: 1,
  },
  {
    value: 'prompts',
    label: i18n.tabPrompts,
    icon: FileText,
    color: 'prompts',
    testId: 'settings-prompts-tab',
    group: 1,
  },
  {
    value: 'keyboard',
    label: i18n.tabKeyboard,
    icon: Keyboard,
    color: 'keyboard',
    testId: 'settings-keyboard-tab',
    group: 2,
  },
  {
    value: 'mcp',
    label: i18n.tabMcp,
    icon: Plug,
    color: 'mcp',
    testId: 'settings-mcp-tab',
    group: 2,
  },
  {
    value: 'plugins',
    label: i18n.tabPlugins,
    icon: Puzzle,
    color: 'plugins',
    testId: 'settings-plugins-tab',
    group: 2,
  },
  {
    value: 'appearance',
    label: i18n.tabAppearance,
    icon: Palette,
    color: 'appearance',
    testId: 'settings-appearance-tab',
    group: 2,
  },
  {
    value: 'app',
    label: i18n.tabApp,
    icon: Monitor,
    color: 'app',
    testId: 'settings-app-tab',
    group: 2,
  },
];

const settingsTabClass =
  'w-full gap-3 rounded-lg px-3 py-2 text-sm font-normal text-text-secondary hover:bg-background-tertiary/60 data-[state=active]:bg-background-tertiary data-[state=active]:text-text-primary data-[state=active]:shadow-none';

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
  const [activeTab, setActiveTab] = useState('models');
  const [searchQuery, setSearchQuery] = useState('');
  const hasTrackedInitialTab = useRef(false);
  const { navWidth } = useNavigationContext();
  const intl = useIntl();

  const activeTabTitle = {
    models: intl.formatMessage(i18n.tabModels),
    providers: intl.formatMessage(i18n.tabProviders),
    chat: intl.formatMessage(i18n.tabChat),
    sharing: intl.formatMessage(i18n.tabAgent),
    prompts: intl.formatMessage(i18n.tabPrompts),
    keyboard: intl.formatMessage(i18n.tabKeyboard),
    mcp: intl.formatMessage(i18n.tabMcp),
    plugins: intl.formatMessage(i18n.tabPlugins),
    appearance: intl.formatMessage(i18n.tabAppearance),
    app: intl.formatMessage(i18n.tabApp),
  }[activeTab];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackSettingsTabViewed(tab);
  };

  // Determine initial tab based on section prop
  useEffect(() => {
    if (viewOptions.section) {
      // Map section names to tab values
      const sectionToTab: Record<string, string> = {
        update: 'app',
        models: 'models',
        providers: 'providers',
        modes: 'chat',
        sharing: 'sharing',
        styles: 'chat',
        tools: 'chat',
        agent: 'sharing',
        app: 'app',
        chat: 'chat',
        prompts: 'prompts',
        keyboard: 'keyboard',
        auth: 'providers',
        mcp: 'mcp',
        plugins: 'plugins',
        appearance: 'appearance',
        theme: 'appearance',
        language: 'appearance',
        'local-inference': 'providers',
      };

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
            <div className="h-[48px] flex-shrink-0 no-drag" />
            <div className="px-2">
              <BackButton
                onClick={onClose}
                variant="ghost"
                className="mb-3 w-full justify-start rounded-lg px-3 text-sm font-medium hover:bg-background-tertiary/60"
              />
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && searchQuery) {
                      // Clear the filter first; only let Escape close Settings when empty.
                      e.stopPropagation();
                      setSearchQuery('');
                    }
                  }}
                  placeholder={intl.formatMessage(i18n.searchPlaceholder)}
                  aria-label={intl.formatMessage(i18n.searchPlaceholder)}
                  data-testid="settings-search-input"
                  className="h-9 rounded-lg pl-9 text-sm [&::-webkit-search-cancel-button]:cursor-pointer"
                />
              </div>
            </div>
            <TabsList className="w-full min-h-0 flex-1 flex-col items-stretch gap-0.5 overflow-y-auto bg-transparent px-2 py-0">
              {SETTINGS_TABS.filter((tab) => {
                if (!searchQuery.trim()) return true;
                return intl
                  .formatMessage(tab.label)
                  .toLowerCase()
                  .includes(searchQuery.trim().toLowerCase());
              }).map((tab, index, visible) => {
                const Icon = tab.icon;
                const startsGroup = index === 0 || visible[index - 1].group !== tab.group;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(settingsTabClass, startsGroup && index > 0 && 'mt-4')}
                    data-testid={tab.testId}
                  >
                    <Icon className="h-5 w-5" style={{ color: iconColor(tab.color) }} />
                    {intl.formatMessage(tab.label)}
                  </TabsTrigger>
                );
              })}
              {searchQuery.trim() &&
                !SETTINGS_TABS.some((tab) =>
                  intl
                    .formatMessage(tab.label)
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase())
                ) && (
                  <p className="px-3 py-2 text-sm text-text-secondary">
                    {intl.formatMessage(i18n.noResults)}
                  </p>
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
                value="models"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ModelsSection setView={setView} />
              </TabsContent>

              <TabsContent
                value="providers"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ProvidersSection setView={setView} />
              </TabsContent>

              <TabsContent
                value="chat"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ChatSettingsSection />
              </TabsContent>

              <TabsContent
                value="sharing"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="space-y-4 pb-8">
                  <AgentLoopSettings />
                  <ExternalBackendSection />
                </div>
              </TabsContent>

              <TabsContent
                value="prompts"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <PromptsSettingsSection />
              </TabsContent>

              <TabsContent
                value="keyboard"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <KeyboardShortcutsSection />
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
                value="appearance"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <AppearanceSettingsSection />
              </TabsContent>

              <TabsContent
                value="app"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="space-y-8">
                  {CONFIGURATION_ENABLED && <ConfigSettings />}
                  <AppSettingsSection scrollToSection={viewOptions.section} />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </main>
      </Tabs>
    </div>
  );
}
