import { useEffect, useState } from 'react';
import { Switch } from '../../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { trackSettingToggled } from '../../../utils/analytics';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  title: {
    id: 'worktreeSettings.title',
    defaultMessage: 'Git worktrees',
  },
  description: {
    id: 'worktreeSettings.description',
    defaultMessage: 'Control which directories the working directory picker offers',
  },
  toggleLabel: {
    id: 'worktreeSettings.toggleLabel',
    defaultMessage: 'Consider git worktrees',
  },
  toggleDescription: {
    id: 'worktreeSettings.toggleDescription',
    defaultMessage:
      'List the other worktrees of the current repository in the working directory picker.',
  },
});

export default function WorktreeSettings() {
  const intl = useIntl();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    window.electron.getSetting('enableWorktrees').then((value) => setEnabled(value !== false));
  }, []);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    await window.electron.setSetting('enableWorktrees', checked);
    trackSettingToggled('git_worktrees', checked);
  };

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-0">
        <CardTitle className="mb-1">{intl.formatMessage(i18n.title)}</CardTitle>
        <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-text-primary text-xs">{intl.formatMessage(i18n.toggleLabel)}</h4>
            <p className="text-xs text-text-secondary max-w-md mt-[2px]">
              {intl.formatMessage(i18n.toggleDescription)}
            </p>
          </div>
          <div className="flex items-center">
            <Switch checked={enabled} onCheckedChange={handleToggle} variant="mono" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}