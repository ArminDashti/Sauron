import { useState, useEffect, useRef } from 'react';
import { defineMessages, useIntl } from '../../../i18n';
import { Button } from '../../ui/button';
import UpdateSection from './UpdateSection';

import { UPDATES_ENABLED } from '../../../updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ThemeSelector from '../../SauronSidebar/ThemeSelector';
import BlockLogoBlack from './icons/block-lockup_black.png';
import BlockLogoWhite from './icons/block-lockup_white.png';
import TelemetrySettings from './TelemetrySettings';

const i18n = defineMessages({
  appearanceTitle: { id: 'settings.appearance.title', defaultMessage: 'Appearance' },
  appearanceDesc: {
    id: 'settings.appearance.description',
    defaultMessage: 'Configure how sauron appears on your system',
  },
  notifications: { id: 'settings.notifications.title', defaultMessage: 'Notifications' },
  notificationsDesc: {
    id: 'settings.notifications.description',
    defaultMessage: 'Notifications are managed by your OS - {link}',
  },
  configGuide: { id: 'settings.notifications.configGuide', defaultMessage: 'Configuration guide' },
  openSettings: { id: 'settings.notifications.openSettings', defaultMessage: 'Open Settings' },
  taskNotifications: {
    id: 'settings.notifications.task.title',
    defaultMessage: 'Task completion notifications',
  },
  taskNotificationsDesc: {
    id: 'settings.notifications.task.description',
    defaultMessage: 'Notify when Sauron finishes a task while the window is in the background',
  },
  menuBarIcon: { id: 'settings.menuBarIcon.title', defaultMessage: 'Menu bar icon' },
  menuBarIconDesc: {
    id: 'settings.menuBarIcon.description',
    defaultMessage: 'Show sauron in the menu bar',
  },
  dockIcon: { id: 'settings.dockIcon.title', defaultMessage: 'Dock icon' },
  dockIconDesc: { id: 'settings.dockIcon.description', defaultMessage: 'Show sauron in the dock' },
  preventSleep: { id: 'settings.preventSleep.title', defaultMessage: 'Prevent Sleep' },
  preventSleepDesc: {
    id: 'settings.preventSleep.description',
    defaultMessage:
      'Keep your computer awake while sauron is running a task (screen can still lock)',
  },
  costTracking: { id: 'settings.costTracking.title', defaultMessage: 'Cost Tracking' },
  costTrackingDesc: {
    id: 'settings.costTracking.description',
    defaultMessage: 'Show model pricing and usage costs',
  },
  themeTitle: { id: 'settings.theme.title', defaultMessage: 'Theme' },
  themeDesc: {
    id: 'settings.theme.description',
    defaultMessage: 'Customize the look and feel of sauron',
  },
  languageTitle: { id: 'settings.language.title', defaultMessage: 'Language' },
  languageDesc: {
    id: 'settings.language.description',
    defaultMessage: 'Choose the display language for sauron',
  },
  languageSystem: { id: 'settings.language.systemDefault', defaultMessage: 'System Default' },
  languageEnglish: { id: 'settings.language.english', defaultMessage: 'English' },
  languageChineseSimplified: {
    id: 'settings.language.zhCN',
    defaultMessage: 'Chinese (Simplified)',
  },
  languageRussian: { id: 'settings.language.russian', defaultMessage: 'Russian' },
  languageTurkish: { id: 'settings.language.turkish', defaultMessage: 'Turkish' },
  languageHindi: { id: 'settings.language.hindi', defaultMessage: 'Hindi' },
  languageJapanese: { id: 'settings.language.japanese', defaultMessage: 'Japanese' },
  languageSpanish: { id: 'settings.language.spanish', defaultMessage: 'Spanish' },
  languageKorean: { id: 'settings.language.korean', defaultMessage: 'Korean' },
  languageFrench: { id: 'settings.language.french', defaultMessage: 'French' },
  languageGerman: { id: 'settings.language.german', defaultMessage: 'German' },
  languageItalian: { id: 'settings.language.italian', defaultMessage: 'Italian' },
  languagePortuguese: { id: 'settings.language.portuguese', defaultMessage: 'Portuguese' },
  languageIndonesian: { id: 'settings.language.indonesian', defaultMessage: 'Indonesian' },
  languageMalay: { id: 'settings.language.malay', defaultMessage: 'Malay' },
  languageVietnamese: { id: 'settings.language.vietnamese', defaultMessage: 'Vietnamese' },
  languageChineseTraditional: {
    id: 'settings.language.zhTW',
    defaultMessage: 'Chinese (Traditional)',
  },
  helpTitle: { id: 'settings.help.title', defaultMessage: 'Help & feedback' },
  helpDesc: {
    id: 'settings.help.description',
    defaultMessage: 'Help us improve sauron by reporting issues or requesting new features',
  },
  reportBug: { id: 'settings.help.reportBug', defaultMessage: 'Report a Bug' },
  requestFeature: { id: 'settings.help.requestFeature', defaultMessage: 'Request a Feature' },
  versionTitle: { id: 'settings.version.title', defaultMessage: 'Version' },
  updatesTitle: { id: 'settings.updates.title', defaultMessage: 'Updates' },
  updatesDesc: {
    id: 'settings.updates.description',
    defaultMessage: 'Check for and install updates to keep sauron running at its best',
  },
  notificationsModalTitle: {
    id: 'settings.notifications.modal.title',
    defaultMessage: 'How to Enable Notifications',
  },
  notificationsMacInstructions: {
    id: 'settings.notifications.modal.macInstructions',
    defaultMessage: 'To enable notifications on macOS:',
  },
  notificationsMacStep1: {
    id: 'settings.notifications.modal.macStep1',
    defaultMessage: 'Open System Preferences',
  },
  notificationsMacStep2: {
    id: 'settings.notifications.modal.macStep2',
    defaultMessage: 'Click on Notifications',
  },
  notificationsMacStep3: {
    id: 'settings.notifications.modal.macStep3',
    defaultMessage: 'Find and select sauron in the application list',
  },
  notificationsMacStep4: {
    id: 'settings.notifications.modal.macStep4',
    defaultMessage: 'Enable notifications and adjust settings as desired',
  },
  notificationsWinInstructions: {
    id: 'settings.notifications.modal.winInstructions',
    defaultMessage: 'To enable notifications on Windows:',
  },
  notificationsWinStep1: {
    id: 'settings.notifications.modal.winStep1',
    defaultMessage: 'Open Settings',
  },
  notificationsWinStep2: {
    id: 'settings.notifications.modal.winStep2',
    defaultMessage: 'Go to System > Notifications',
  },
  notificationsWinStep3: {
    id: 'settings.notifications.modal.winStep3',
    defaultMessage: 'Find and select sauron in the application list',
  },
  notificationsWinStep4: {
    id: 'settings.notifications.modal.winStep4',
    defaultMessage: 'Toggle notifications on and adjust settings as desired',
  },
  close: { id: 'settings.close', defaultMessage: 'Close' },
});

interface AppSettingsSectionProps {
  scrollToSection?: string;
}

export default function AppSettingsSection({ scrollToSection }: AppSettingsSectionProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const updateSectionRef = useRef<HTMLDivElement>(null);
  const shouldShowUpdates = !window.appConfig.get('SAURON_VERSION');

  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (scrollToSection === 'update' && updateSectionRef.current) {
      setTimeout(() => {
        updateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [scrollToSection]);

  const intl = useIntl();

  return (
    <div className="space-y-4 pr-4 pb-8 mt-1">
      <TelemetrySettings />

      <Card className="rounded-lg">
        <CardHeader className="pb-0">
          <CardTitle className="mb-1">{intl.formatMessage(i18n.helpTitle)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.helpDesc)}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-4">
          <div className="flex space-x-4">
            <Button
              onClick={() => {
                window.open(
                  'https://github.com/ArminDashti/Sauron/issues/new?template=bug_report.md',
                  '_blank'
                );
              }}
              variant="secondary"
              size="sm"
            >
              {intl.formatMessage(i18n.reportBug)}
            </Button>
            <Button
              onClick={() => {
                window.open(
                  'https://github.com/ArminDashti/Sauron/issues/new?template=feature_request.md',
                  '_blank'
                );
              }}
              variant="secondary"
              size="sm"
            >
              {intl.formatMessage(i18n.requestFeature)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version Section - only show if SAURON_VERSION is set */}
      {!shouldShowUpdates && (
        <Card className="rounded-lg">
          <CardHeader className="pb-0">
            <CardTitle className="mb-1">{intl.formatMessage(i18n.versionTitle)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4">
            <div className="flex items-center gap-3">
              <img
                src={isDarkMode ? BlockLogoWhite : BlockLogoBlack}
                alt="Block Logo" // TODO: replace with AAIF logo asset
                className="h-8 w-auto"
              />
              <span className="text-2xl font-mono text-black dark:text-white">
                {String(window.appConfig.get('SAURON_VERSION') || 'Development')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Section - only show if SAURON_VERSION is NOT set */}
      {UPDATES_ENABLED && shouldShowUpdates && (
        <div ref={updateSectionRef}>
          <Card className="rounded-lg">
            <CardHeader className="pb-0">
              <CardTitle className="mb-1">{intl.formatMessage(i18n.updatesTitle)}</CardTitle>
              <CardDescription>{intl.formatMessage(i18n.updatesDesc)}</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <UpdateSection />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
