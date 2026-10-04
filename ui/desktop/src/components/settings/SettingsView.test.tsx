import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsView from './SettingsView';
import { IntlTestWrapper } from '../../i18n/test-utils';
import { NavigationProvider } from '../Layout/NavigationContext';

vi.mock('./providers/ProvidersSection', () => ({ default: () => null }));
vi.mock('./app/ExternalBackendSection', () => ({ default: () => null }));
vi.mock('./AgentLoopSettings', () => ({ default: () => null }));
vi.mock('./app/AppSettingsSection', () => ({ default: () => null }));
vi.mock('./appearance/AppearanceSettingsSection', () => ({ default: () => null }));
vi.mock('./mcp/McpSettingsSection', () => ({ default: () => null }));
vi.mock('./plugins/PluginsSettingsSection', () => ({ default: () => null }));
vi.mock('./config/ConfigSettings', () => ({ default: () => null }));
vi.mock('./PromptsSettingsSection', () => ({ default: () => null }));
vi.mock('./chat/ChatSettingsSection', () => ({ default: () => null }));
vi.mock('./keyboard/KeyboardShortcutsSection', () => ({ default: () => null }));
vi.mock('./harnesses/HarnessesSection', () => ({ default: () => null }));
vi.mock('./skills/SkillsSection', () => ({ default: () => null }));

vi.mock('../../utils/analytics', () => ({
  trackSettingsTabViewed: vi.fn(),
}));

const renderSettings = (section?: string) =>
  render(<SettingsView onClose={vi.fn()} setView={vi.fn()} viewOptions={{ section }} />, {
    wrapper: ({ children }) => (
      <IntlTestWrapper>
        <NavigationProvider>{children}</NavigationProvider>
      </IntlTestWrapper>
    ),
  });

const tabLabels = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

const activeTabTestId = () =>
  screen
    .getAllByRole('tab')
    .find((tab) => tab.getAttribute('data-state') === 'active')
    ?.getAttribute('data-testid');

describe('SettingsView', () => {
  it('orders the settings tabs from Appearance down to App', () => {
    renderSettings();

    expect(tabLabels()).toEqual([
      'Appearance',
      'Providers',
      'Agent',
      'Skills',
      'MCP',
      'Plugins',
      'App',
    ]);
  });

  it('shows a robot icon on the Agent tab', () => {
    renderSettings();

    expect(
      screen.getByTestId('settings-agent-tab').querySelector('svg')?.getAttribute('class')
    ).toContain('lucide-bot');
  });

  it('resolves merged sections to the tab that now owns them', () => {
    const cases: Array<[string, string]> = [
      ['models', 'settings-providers-tab'],
      ['local-inference', 'settings-providers-tab'],
      ['harnesses', 'settings-agent-tab'],
      ['sharing', 'settings-agent-tab'],
      ['chat', 'settings-appearance-tab'],
      ['keyboard', 'settings-app-tab'],
    ];

    for (const [section, expectedTab] of cases) {
      const { unmount } = renderSettings(section);
      expect(activeTabTestId()).toBe(expectedTab);
      unmount();
    }
  });

  it('opens on Appearance by default', () => {
    renderSettings();

    expect(activeTabTestId()).toBe('settings-appearance-tab');
  });
});
