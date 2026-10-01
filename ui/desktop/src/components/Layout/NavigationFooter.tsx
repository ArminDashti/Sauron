import React, { useEffect, useState } from 'react';
import { MessageCircleHeart } from 'lucide-react';
import { defineMessages, useIntl } from '../../i18n';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { getNavItemLabel, SETTINGS_NAV_ITEM } from '../../hooks/useNavigationItems';
import { formatUserName, getUserInitials } from '../../utils/userProfile';
import { cn } from '../../utils';

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
});

interface NavigationFooterProps {
  settingsActive: boolean;
  onOpenSettings: () => void;
}

const NavigationFooter: React.FC<NavigationFooterProps> = ({ settingsActive, onOpenSettings }) => {
  const intl = useIntl();
  const [displayName, setDisplayName] = useState('');

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

  const name = displayName || intl.formatMessage(i18n.you);
  const feedbackLabel = intl.formatMessage(i18n.sendFeedback);
  const settingsLabel = getNavItemLabel(SETTINGS_NAV_ITEM, intl);
  const SettingsIcon = SETTINGS_NAV_ITEM.icon;

  return (
    <div className="flex items-center gap-1 px-2 pb-2 pt-1">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <div
          aria-hidden="true"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background-tertiary text-xs font-semibold text-text-primary"
        >
          {getUserInitials(name)}
        </div>
        <span className="truncate text-sm font-medium text-text-primary">{name}</span>
      </div>

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
            <MessageCircleHeart />
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
            onClick={onOpenSettings}
            className={cn(
              'text-text-secondary hover:text-text-primary',
              settingsActive && 'bg-background-tertiary text-text-primary'
            )}
          >
            <SettingsIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{settingsLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default NavigationFooter;
