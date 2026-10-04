import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { defineMessages, useIntl } from '../../../i18n';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  customThemeColorSlots,
  normalizeCustomTheme,
  slotColor,
  withSlotColor,
  type CustomTheme,
} from '../../../theme/custom-theme';
import { resolveThemeTokens } from '../../../theme/theme-tokens';

const i18n = defineMessages({
  nameLabel: { id: 'customTheme.nameLabel', defaultMessage: 'Theme name' },
  namePlaceholder: { id: 'customTheme.namePlaceholder', defaultMessage: 'My theme' },
  baseLabel: { id: 'customTheme.baseLabel', defaultMessage: 'Base' },
  baseDark: { id: 'customTheme.baseDark', defaultMessage: 'Dark base' },
  baseLight: { id: 'customTheme.baseLight', defaultMessage: 'Light base' },
  colorsLabel: { id: 'customTheme.colorsLabel', defaultMessage: 'Colors' },
  previewLabel: { id: 'customTheme.previewLabel', defaultMessage: 'Preview' },
  previewText: { id: 'customTheme.previewText', defaultMessage: 'The quick brown fox' },
  previewSurface: { id: 'customTheme.previewSurface', defaultMessage: 'Secondary surface' },
  previewAccent: { id: 'customTheme.previewAccent', defaultMessage: 'Accent' },
  save: { id: 'customTheme.save', defaultMessage: 'Save and use' },
  saved: { id: 'customTheme.saved', defaultMessage: 'Saved' },
  resetColors: { id: 'customTheme.resetColors', defaultMessage: 'Reset colors' },
  inactiveNotice: {
    id: 'customTheme.inactiveNotice',
    defaultMessage: 'The custom theme is saved but not active yet.',
  },
});

const toDraft = (theme: CustomTheme): CustomTheme => ({ ...theme, colors: { ...theme.colors } });

export default function CustomThemeEditor() {
  const intl = useIntl();
  const { customTheme, saveCustomTheme, userThemePreference } = useTheme();
  const [draft, setDraft] = useState<CustomTheme>(() => toDraft(customTheme));
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setDraft(toDraft(customTheme));
  }, [customTheme]);

  const previewTokens = resolveThemeTokens('custom', draft);
  const tokenColor = (token: keyof typeof previewTokens) => previewTokens[token];

  const updateDraft = (next: CustomTheme) => {
    setDraft(next);
    setIsSaved(false);
  };

  const handleSave = async () => {
    await saveCustomTheme(normalizeCustomTheme(draft));
    setIsSaved(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          {intl.formatMessage(i18n.nameLabel)}
          <Input
            value={draft.name}
            onChange={(event) => updateDraft({ ...draft, name: event.target.value })}
            placeholder={intl.formatMessage(i18n.namePlaceholder)}
            className="w-52"
            aria-label={intl.formatMessage(i18n.nameLabel)}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-text-secondary">
          {intl.formatMessage(i18n.baseLabel)}
          <div className="flex gap-1">
            <Button
              variant={draft.variant === 'dark' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => updateDraft({ ...draft, variant: 'dark' })}
            >
              {intl.formatMessage(i18n.baseDark)}
            </Button>
            <Button
              variant={draft.variant === 'light' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => updateDraft({ ...draft, variant: 'light' })}
            >
              {intl.formatMessage(i18n.baseLight)}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-text-secondary">
          {intl.formatMessage(i18n.colorsLabel)}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {customThemeColorSlots.map((slot) => {
            const label = intl.formatMessage(slot.label);
            const value = slotColor(draft.colors, slot) ?? tokenColor(slot.tokens[0]);
            return (
              <label
                key={slot.id}
                className="flex items-center gap-2 rounded-md border border-border-primary px-2 py-1.5 text-xs text-text-primary"
              >
                <input
                  type="color"
                  value={value}
                  aria-label={label}
                  onChange={(event) =>
                    updateDraft({
                      ...draft,
                      colors: withSlotColor(draft.colors, slot, event.target.value),
                    })
                  }
                  className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border-primary bg-transparent p-0"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-text-secondary">
          {intl.formatMessage(i18n.previewLabel)}
        </div>
        <div
          data-testid="custom-theme-preview"
          className="rounded-lg border p-4"
          style={{
            backgroundColor: tokenColor('--color-background-primary'),
            borderColor: tokenColor('--color-border-primary'),
            color: tokenColor('--color-text-primary'),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{intl.formatMessage(i18n.previewText)}</span>
            <span
              className="rounded-md px-3 py-1 text-xs"
              style={{
                backgroundColor: tokenColor('--color-background-inverse'),
                color: tokenColor('--color-text-inverse'),
              }}
            >
              {intl.formatMessage(i18n.previewAccent)}
            </span>
          </div>
          <div
            className="mt-3 rounded-md px-3 py-2 text-xs"
            style={{
              backgroundColor: tokenColor('--color-background-secondary'),
              color: tokenColor('--color-text-secondary'),
            }}
          >
            {intl.formatMessage(i18n.previewSurface)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleSave}>
          {isSaved && <Check className="h-3.5 w-3.5" />}
          {intl.formatMessage(isSaved ? i18n.saved : i18n.save)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={Object.keys(draft.colors).length === 0}
          onClick={() => updateDraft({ ...draft, colors: {} })}
        >
          {intl.formatMessage(i18n.resetColors)}
        </Button>
        {userThemePreference !== 'custom' && (
          <span className="text-xs text-text-secondary">
            {intl.formatMessage(i18n.inactiveNotice)}
          </span>
        )}
      </div>
    </div>
  );
}
