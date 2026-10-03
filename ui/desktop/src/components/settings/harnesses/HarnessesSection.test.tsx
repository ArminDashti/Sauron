import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HarnessesSection from './HarnessesSection';
import { acpListProviderDetails, acpListSetupCatalog } from '../../../acp/providers';
import type { ProviderDetails } from '../../../types/providers';
import type { ProviderSetupCatalogEntryDto } from '@aaif/sauron-acp-client';
import { IntlTestWrapper } from '../../../i18n/test-utils';

vi.mock('../../../acp/providers', () => ({
  acpListProviderDetails: vi.fn(),
  acpListSetupCatalog: vi.fn(),
}));

vi.mock('../providers/modal/ProviderConfigurationModal', () => ({
  default: ({
    provider,
    onConfigured,
  }: {
    provider: ProviderDetails;
    onConfigured?: (provider: ProviderDetails) => void;
  }) => (
    <div data-testid="provider-configuration-modal">
      <span>{provider.name}</span>
      <button type="button" onClick={() => onConfigured?.(provider)}>
        Confirm
      </button>
    </div>
  ),
}));

const mockedListSetupCatalog = vi.mocked(acpListSetupCatalog);
const mockedListProviderDetails = vi.mocked(acpListProviderDetails);

const renderWithIntl = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: IntlTestWrapper, ...options });

const catalogEntry = (
  overrides: Partial<ProviderSetupCatalogEntryDto> = {}
): ProviderSetupCatalogEntryDto => ({
  providerId: 'cursor-agent',
  name: 'Cursor Agent',
  category: 'agent',
  acp: false,
  description: 'Execute AI models via cursor-agent CLI tool',
  setupMethod: 'cli_auth',
  group: 'default',
  showOnlyWhenInstalled: false,
  supportsInstall: false,
  supportsAuth: false,
  supportsAuthStatus: false,
  ...overrides,
});

const providerDetails = (overrides: Partial<ProviderDetails> = {}): ProviderDetails => ({
  name: 'cursor-agent',
  is_configured: false,
  is_available: true,
  visible_in_setup: true,
  deprecated: false,
  provider_type: 'Builtin',
  uses_acp: false,
  metadata: {
    name: 'cursor-agent',
    display_name: 'Cursor Agent',
    description: 'Execute AI models via cursor-agent CLI tool',
    default_model: 'auto',
    model_doc_link: '',
    config_keys: [],
    known_models: [],
  },
  ...overrides,
});

describe('HarnessesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state and then lists the supported agent harnesses', async () => {
    mockedListSetupCatalog.mockResolvedValue([
      catalogEntry(),
      catalogEntry({ providerId: 'claude-acp', name: 'Claude Code ACP' }),
    ]);
    mockedListProviderDetails.mockResolvedValue([
      providerDetails(),
      providerDetails({ name: 'claude-acp', is_available: false }),
    ]);

    renderWithIntl(<HarnessesSection />);

    expect(screen.getByText('Loading harnesses...')).toBeInTheDocument();
    expect(await screen.findByText('Cursor Agent')).toBeInTheDocument();
    expect(screen.getByText('Claude Code ACP')).toBeInTheDocument();
  });

  it('lists only the supported harnesses in a stable order', async () => {
    mockedListSetupCatalog.mockResolvedValue([
      catalogEntry(),
      catalogEntry({ providerId: 'copilot-acp', name: 'GitHub Copilot CLI (ACP)' }),
      catalogEntry({ providerId: 'codex-acp', name: 'Codex ACP' }),
      catalogEntry({ providerId: 'opencode-acp', name: 'OpenCode' }),
      // Harnesses sauron does not support stay out of this section, even when
      // their CLI is installed.
      catalogEntry({ providerId: 'amp-acp', name: 'Amp' }),
      catalogEntry({ providerId: 'pi-acp', name: 'Pi', showOnlyWhenInstalled: true }),
      catalogEntry({ providerId: 'goose', name: 'Goose' }),
      // Model providers never belong here.
      catalogEntry({ providerId: 'openai', name: 'OpenAI', category: 'model' }),
    ]);
    mockedListProviderDetails.mockResolvedValue([
      providerDetails(),
      providerDetails({ name: 'copilot-acp' }),
      providerDetails({ name: 'codex-acp' }),
      providerDetails({ name: 'opencode-acp' }),
      providerDetails({ name: 'amp-acp' }),
      providerDetails({ name: 'pi-acp' }),
    ]);

    renderWithIntl(<HarnessesSection />);

    expect(await screen.findByText('Cursor Agent')).toBeInTheDocument();
    const rendered = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(rendered).toEqual(['Codex ACP', 'Cursor Agent', 'OpenCode', 'GitHub Copilot CLI (ACP)']);
    expect(screen.queryByText('Amp')).not.toBeInTheDocument();
    expect(screen.queryByText('Pi')).not.toBeInTheDocument();
    expect(screen.queryByText('Goose')).not.toBeInTheDocument();
    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
  });

  it('renders a brand icon for each supported harness', async () => {
    mockedListSetupCatalog.mockResolvedValue([
      catalogEntry(),
      catalogEntry({ providerId: 'opencode-acp', name: 'OpenCode' }),
    ]);
    mockedListProviderDetails.mockResolvedValue([
      providerDetails(),
      providerDetails({ name: 'opencode-acp' }),
    ]);

    const { container } = renderWithIntl(<HarnessesSection />);

    expect(await screen.findByText('Cursor Agent')).toBeInTheDocument();
    const icons = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(icons).toHaveLength(2);
    icons.forEach((src) => expect(src).toMatch(/\.svg|data:image/));
  });

  it('shows enabled and installation status per harness', async () => {
    mockedListSetupCatalog.mockResolvedValue([
      catalogEntry(),
      catalogEntry({ providerId: 'codex-acp', name: 'Codex' }),
    ]);
    mockedListProviderDetails.mockResolvedValue([
      providerDetails({ is_configured: true }),
      providerDetails({ name: 'codex-acp', is_available: false }),
    ]);

    renderWithIntl(<HarnessesSection />);

    expect(await screen.findByText('Cursor Agent')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
    expect(screen.getByText('Codex')).toBeInTheDocument();
    expect(screen.getByText('Not enabled')).toBeInTheDocument();
    expect(screen.getByText('Not installed')).toBeInTheDocument();
  });

  it('omits a supported harness the setup catalog does not advertise', async () => {
    mockedListSetupCatalog.mockResolvedValue([catalogEntry()]);
    mockedListProviderDetails.mockResolvedValue([
      providerDetails(),
      providerDetails({ name: 'claude-acp' }),
    ]);

    renderWithIntl(<HarnessesSection />);

    expect(await screen.findByText('Cursor Agent')).toBeInTheDocument();
    expect(screen.queryByText('Claude Code')).not.toBeInTheDocument();
  });

  it('opens the configuration modal and refreshes after configuring', async () => {
    const user = userEvent.setup();
    mockedListSetupCatalog
      .mockResolvedValueOnce([catalogEntry()])
      .mockResolvedValue([catalogEntry()]);
    mockedListProviderDetails
      .mockResolvedValueOnce([providerDetails()])
      .mockResolvedValue([providerDetails({ is_configured: true })]);

    renderWithIntl(<HarnessesSection />);

    await user.click(await screen.findByRole('button', { name: 'Configure' }));
    expect(screen.getByTestId('provider-configuration-modal')).toBeInTheDocument();
    expect(screen.getByText('cursor-agent')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.queryByTestId('provider-configuration-modal')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
    expect(mockedListSetupCatalog).toHaveBeenCalledTimes(2);
  });

  it('shows an error when loading fails', async () => {
    mockedListSetupCatalog.mockRejectedValue(new Error('ACP unavailable'));
    mockedListProviderDetails.mockRejectedValue(new Error('ACP unavailable'));

    renderWithIntl(<HarnessesSection />);

    expect(
      await screen.findByText(/Failed to load harnesses: ACP unavailable/)
    ).toBeInTheDocument();
  });
});
