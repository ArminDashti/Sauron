import React, { useMemo } from 'react';
import { Moon, Sliders, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import { defineMessages, useIntl } from '../../i18n';
import { POPULAR_THEME_IDS, POPULAR_THEME_LABELS, themeSwatch } from '../../theme/popular-themes';
import type { ThemeId } from '../../theme/theme-tokens';

const i18n = defineMessages({
  theme: {
    id: 'themeSelector.theme',
    defaultMessage: 'Theme',
  },
  light: {
    id: 'themeSelector.light',
    defaultMessage: 'Light',
  },
  dark: {
    id: 'themeSelector.dark',
    defaultMessage: 'Dark',
  },
  aura: {
    id: 'themeSelector.aura',
    defaultMessage: 'Aura',
  },
  system: {
    id: 'themeSelector.system',
    defaultMessage: 'System',
  },
  popular: {
    id: 'themeSelector.popular',
    defaultMessage: 'Popular themes',
  },
});

interface ThemeSelectorProps {
  className?: string;
  hideTitle?: boolean;
  horizontal?: boolean;
}

const baseButtonClass =
  'flex items-center justify-center gap-1 p-2 rounded-md border transition-colors text-xs';

const modeButtonClass = (active: boolean) =>
  `${baseButtonClass} ${
    active
      ? 'bg-background-inverse text-text-inverse border-text-inverse hover:!bg-background-inverse hover:!text-text-inverse'
      : 'border-border-primary hover:!bg-background-secondary text-text-secondary hover:text-text-primary'
  }`;

const swatchButtonClass = (active: boolean) =>
  `${baseButtonClass} justify-start gap-2 overflow-hidden ${
    active
      ? 'border-text-inverse bg-background-secondary text-text-primary'
      : 'border-border-primary hover:!bg-background-secondary text-text-secondary hover:text-text-primary'
  }`;

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  hideTitle = false,
  horizontal = false,
}) => {
  const intl = useIntl();
  const { userThemePreference, setUserThemePreference } = useTheme();

  const namedThemes = useMemo(
    () => [
      {
        id: 'aura' as ThemeId,
        label: intl.formatMessage(i18n.aura),
        swatch: { background: '#201e2b', accent: '#a277ff' },
      },
      ...POPULAR_THEME_IDS.map((id) => ({
        id: id as ThemeId,
        label: POPULAR_THEME_LABELS[id],
        swatch: themeSwatch(id),
      })),
    ],
    [intl]
  );

  return (
    <div className={`${!horizontal ? 'px-1 py-2 space-y-3' : ''} ${className}`}>
      {!hideTitle && (
        <div className="text-xs text-text-primary px-3">{intl.formatMessage(i18n.theme)}</div>
      )}

      <div className={`flex flex-wrap gap-1 ${!horizontal ? 'px-3' : ''}`}>
        <Button
          data-testid="system-mode-button"
          onClick={() => setUserThemePreference('system')}
          className={modeButtonClass(userThemePreference === 'system')}
          variant="ghost"
          size="sm"
        >
          <Sliders className="h-3 w-3" />
          <span>{intl.formatMessage(i18n.system)}</span>
        </Button>

        <Button
          data-testid="light-mode-button"
          onClick={() => setUserThemePreference('light')}
          className={modeButtonClass(userThemePreference === 'light')}
          variant="ghost"
          size="sm"
        >
          <Sun className="h-3 w-3" />
          <span>{intl.formatMessage(i18n.light)}</span>
        </Button>

        <Button
          data-testid="dark-mode-button"
          onClick={() => setUserThemePreference('dark')}
          className={modeButtonClass(userThemePreference === 'dark')}
          variant="ghost"
          size="sm"
        >
          <Moon className="h-3 w-3" />
          <span>{intl.formatMessage(i18n.dark)}</span>
        </Button>
      </div>

      <div className={!horizontal ? 'px-3' : ''}>
        <div className="mb-1.5 text-xs text-text-secondary">
          {intl.formatMessage(i18n.popular)}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {namedThemes.map(({ id, label, swatch }) => (
            <Button
              key={id}
              data-testid={`theme-${id}-button`}
              onClick={() => setUserThemePreference(id)}
              className={swatchButtonClass(userThemePreference === id)}
              variant="ghost"
              size="sm"
              title={label}
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/20"
                style={{
                  backgroundColor: swatch.background,
                  boxShadow: `inset 0 0 0 3px ${swatch.accent}`,
                }}
              />
              <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
