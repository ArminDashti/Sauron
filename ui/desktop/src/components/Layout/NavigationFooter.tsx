import React, { useEffect, useState } from 'react';
import {
  ChevronUp,
  Cpu,
  Database,
  Disc3,
  Download,
  Info,
  Keyboard,
  MessageCircleHeart,
  Power,
  Settings,
  Upload,
} from 'lucide-react';
import { defineMessages, useIntl } from '../../i18n';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { getNavItemLabel, SETTINGS_NAV_ITEM } from '../../hooks/useNavigationItems';
import { formatUserName, getUserInitials } from '../../utils/userProfile';
import { iconColor } from '../../theme/iconColors';
import { cn } from '../../utils';
import type { SystemUsage } from '../../utils/systemUsage';

const FEEDBACK_URL = 'https://github.com/aaif-goose/goose/issues/new/choose';

const i18n = defineMessages({
  sendFeedback: {
    id: 'navigationFooter.sendFeedback',
    defaultMessage: 'Send feedback',
  },
  you: {
    id: 'navigationFooter.you',
    defaultMessage: 'You',
  },
  cpuUsage: {
    id: 'navigationFooter.cpuUsage',
    defaultMessage: 'CPU {value}%',
  },
  memoryUsage: {
    id: 'navigationFooter.memoryUsage',
    defaultMessage: 'Mem {value}%',
  },
  diskUsage: {
    id: 'navigationFooter.diskUsage',
    defaultMessage: 'Disk Usage {value}%',
  },
  systemUsage: {
    id: 'navigationFooter.systemUsage',
    defaultMessage: 'System usage',
  },
  accountMenu: {
    id: 'navigationFooter.accountMenu',
    defaultMessage: 'Account',
  },
  keyboardShortcuts: {
    id: 'navigationFooter.keyboardShortcuts',
    defaultMessage: 'Keyboard shortcuts',
  },
  about: {
    id: 'navigationFooter.about',
    defaultMessage: 'About Sauron',
  },
  aboutVersion: {
    id: 'navigationFooter.aboutVersion',
    defaultMessage: 'Sauron {version}',
  },
  quit: {
    id: 'navigationFooter.quit',
    defaultMessage: 'Quit Sauron',
  },
  close: {
    id: 'navigationFooter.close',
    defaultMessage: 'Close',
  },
});

interface NavigationFooterProps {
  settingsActive: boolean;
  /** Opens Settings, optionally deep-linked to a section. */
  onOpenSettings: (section?: string) => void;
}

const NavigationFooter: React.FC<NavigationFooterProps> = ({ settingsActive, onOpenSettings }) => {
  const intl = useIntl();
  const [displayName, setDisplayName] = useState('');
  const [systemUsage, setSystemUsage] = useState<SystemUsage | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    window.electron
      .getUserProfile()
      .then((profile) => {
        if (isMounted) setDisplayName(formatUserName(profile.username));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUsage = async () => {
      try {
        const usage = await window.electron.getSystemUsage();
        if (isMounted) setSystemUsage(usage);
      } catch {
        // Silently fail
      }
    };
    fetchUsage();
    const interval = setInterval(fetchUsage, 2000); // Update every 2 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const name = displayName || intl.formatMessage(i18n.you);
  const feedbackLabel = intl.formatMessage(i18n.sendFeedback);
  const settingsLabel = getNavItemLabel(SETTINGS_NAV_ITEM, intl);
  const SettingsIcon = SETTINGS_NAV_ITEM.icon;

  return (
    <div className="flex flex-col gap-1 px-2 pb-2 pt-1">
      {systemUsage && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-testid="system-usage"
              role="group"
              aria-label={intl.formatMessage(i18n.systemUsage)}
              className="grid grid-cols-3 gap-1 px-1 text-[10px] font-sans tabular-nums text-text-secondary [&_>span]:min-w-0"
            >
              {[
                {
                  label: intl.formatMessage(i18n.cpuUsage, { value: systemUsage.cpuPercent }),
                  Icon: Cpu,
                  tone: 'text-cyan-500 dark:text-cyan-300',
                },
                {
                  label: intl.formatMessage(i18n.memoryUsage, { value: systemUsage.memoryPercent }),
                  Icon: Database,
                  tone: 'text-violet-500 dark:text-violet-300',
                },
                {
                  label: `Disk ${systemUsage.diskPercent}%`,
                  Icon: Disc3,
                  tone: 'text-amber-600 dark:text-amber-300',
                },
              ].map(({ label, Icon, tone }, index) => (
                <span
                  key={label}
                  aria-label={index === 2 ? `Disk Usage ${systemUsage.diskPercent}%` : label}
                  title={index === 2 ? `Disk Usage ${systemUsage.diskPercent}%` : label}
                  className="inline-flex min-w-0 items-center gap-1 rounded-md bg-background-tertiary/60 px-1 py-1"
                >
                  <Icon className={`h-3 w-3 shrink-0 ${tone}`} aria-hidden="true" />
                  <span className="truncate">
                    {index === 1 ? `Mem ${systemUsage.memoryPercent}%` : label}
                  </span>
                </span>
              ))}
              <span className="col-span-3 flex min-w-0 items-center justify-between rounded-md bg-background-tertiary/40 px-1 py-1">
                <span
                  className="inline-flex min-w-0 items-center gap-1 truncate"
                  aria-label={`Download ${systemUsage.downloadMbps} Mbps`}
                  title={`Download ${systemUsage.downloadMbps} Mbps`}
                >
                  <Download
                    className="h-3 w-3 text-emerald-600 dark:text-emerald-300"
                    aria-hidden="true"
                  />
                  ↓{systemUsage.downloadMbps}
                </span>
                <span
                  className="inline-flex min-w-0 items-center gap-1 truncate"
                  aria-label={`Upload ${systemUsage.uploadMbps} Mbps`}
                  title={`Upload ${systemUsage.uploadMbps} Mbps`}
                >
                  <Upload className="h-3 w-3 text-sky-600 dark:text-sky-300" aria-hidden="true" />↑
                  {systemUsage.uploadMbps}
                </span>
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <span className="whitespace-nowrap">
              CPU {systemUsage.cpuPercent}% · Mem {systemUsage.memoryPercent}% · Disk Usage{' '}
              {systemUsage.diskPercent}% · Download {systemUsage.downloadMbps} Mbps · Upload{' '}
              {systemUsage.uploadMbps} Mbps
            </span>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="profile-menu-trigger"
              aria-label={intl.formatMessage(i18n.accountMenu)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-1 py-1 text-left transition-colors hover:bg-background-tertiary/60"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background-tertiary text-xs font-semibold text-text-primary"
              >
                {getUserInitials(name)}
              </span>
              <span className="truncate text-sm font-medium text-text-primary">{name}</span>
              <ChevronUp className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onOpenSettings()}>
              <Settings className="mr-2 h-4 w-4" style={{ color: iconColor('settings') }} />
              {settingsLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenSettings('keyboard')}>
              <Keyboard />
              {intl.formatMessage(i18n.keyboardShortcuts)}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.electron.openExternal(FEEDBACK_URL)}>
              <MessageCircleHeart />
              {feedbackLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsAboutOpen(true)}>
              <Info />
              {intl.formatMessage(i18n.about)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.electron.closeWindow()}>
              <Power />
              {intl.formatMessage(i18n.quit)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              shape="round"
              aria-label={feedbackLabel}
              onClick={() => window.electron.openExternal(FEEDBACK_URL)}
              className="text-text-secondary hover:text-text-primary"
            >
              <MessageCircleHeart style={{ color: iconColor('feedback') }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{feedbackLabel}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              shape="round"
              aria-label={settingsLabel}
              onClick={() => onOpenSettings()}
              className={cn(
                'text-text-secondary hover:text-text-primary',
                settingsActive && 'bg-background-tertiary text-text-primary'
              )}
            >
              <SettingsIcon style={{ color: iconColor('settings') }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{settingsLabel}</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{intl.formatMessage(i18n.about)}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage(i18n.aboutVersion, { version: window.electron.getVersion() })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsAboutOpen(false)}>
              {intl.formatMessage(i18n.close)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NavigationFooter;
