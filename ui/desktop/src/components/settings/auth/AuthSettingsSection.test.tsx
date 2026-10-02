import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthSettingsSection from './AuthSettingsSection';
import {
  acpAuthenticateProvider,
  acpDeleteProviderSecret,
  acpListProviderSecrets,
  type ProviderSecretDto,
} from '../../../acp/providers';
import { acpReadConfig, acpRemoveConfig, acpUpsertConfig } from '../../../acp/config';
import { getConfiguredExtensions, setConfigExtensionEnabled } from '../../../acp/extensions';
import { IntlTestWrapper } from '../../../i18n/test-utils';
import { toast } from 'react-toastify';

vi.mock('../../../acp/providers', () => ({
  acpAuthenticateProvider: vi.fn(),
  acpListProviderSecrets: vi.fn(),
  acpDeleteProviderSecret: vi.fn(),
}));

vi.mock('../../../acp/config', () => ({
  acpReadConfig: vi.fn(),
  acpUpsertConfig: vi.fn(),
  acpRemoveConfig: vi.fn(),
}));

vi.mock('../../../acp/extensions', () => ({
  getConfiguredExtensions: vi.fn(),
  setConfigExtensionEnabled: vi.fn(),
}));

vi.mock('../../ModelAndProviderContext', () => ({
  useModelAndProvider: () => ({
    currentProvider: 'openai',
  }),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedListProviderSecrets = vi.mocked(acpListProviderSecrets);
const mockedDeleteProviderSecret = vi.mocked(acpDeleteProviderSecret);
const mockedAcpAuthenticateProvider = vi.mocked(acpAuthenticateProvider);
const mockedToast = vi.mocked(toast);
const mockedAcpReadConfig = vi.mocked(acpReadConfig);
const mockedAcpUpsertConfig = vi.mocked(acpUpsertConfig);
const mockedAcpRemoveConfig = vi.mocked(acpRemoveConfig);
const mockedGetConfiguredExtensions = vi.mocked(getConfiguredExtensions);
const mockedSetConfigExtensionEnabled = vi.mocked(setConfigExtensionEnabled);

const renderWithIntl = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: IntlTestWrapper, ...options });

const providerSecret: ProviderSecretDto = {
  id: 'secret_store:openai:OPENAI_API_KEY',
  provider: 'openai',
  providerDisplayName: 'OpenAI',
  name: 'OPENAI_API_KEY',
  storage: 'secret_store',
  expiresAt: null,
  status: 'unknown',
  configured: true,
  hasSecret: true,
  canDelete: true,
  canConfigure: false,
  configureProvider: null,
};

describe('AuthSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListProviderSecrets.mockResolvedValue([]);
    mockedDeleteProviderSecret.mockResolvedValue(undefined);
    mockedAcpAuthenticateProvider.mockResolvedValue(undefined);
    mockedAcpReadConfig.mockResolvedValue(null);
    mockedAcpUpsertConfig.mockResolvedValue(undefined);
    mockedAcpRemoveConfig.mockResolvedValue(undefined);
    mockedGetConfiguredExtensions.mockResolvedValue({ extensions: [], warnings: [] });
    mockedSetConfigExtensionEnabled.mockResolvedValue(undefined);
    Object.assign(window, {
      electron: {
        githubDeviceStart: vi.fn(),
        githubDevicePoll: vi.fn(),
        openExternal: vi.fn().mockResolvedValue('opened'),
      },
    });
  });

  it('renders an empty state when no credentials are stored', async () => {
    renderWithIntl(<AuthSettingsSection />);

    expect(screen.getByText('Loading credentials...')).toBeInTheDocument();
    expect(
      await screen.findByText('No locally stored provider credentials were found.')
    ).toBeInTheDocument();
  });

  it('renders provider credentials with storage and expiry status', async () => {
    mockedListProviderSecrets.mockResolvedValue([
      {
        ...providerSecret,
        expiresAt: '2027-01-01T12:00:00Z',
        status: 'valid',
      },
    ]);

    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('Secret store')).toBeInTheDocument();
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });

  it('does not render an expiry badge when expiry is unknown', async () => {
    mockedListProviderSecrets.mockResolvedValue([providerSecret]);

    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Secret store')).toBeInTheDocument();
    expect(screen.queryByText('Expiry unknown')).not.toBeInTheDocument();
    expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
  });

  it('deletes a credential after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    mockedListProviderSecrets.mockResolvedValueOnce([providerSecret]).mockResolvedValueOnce([]);

    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('OpenAI')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete credential' }));

    expect(
      screen.getByText('Delete the OPENAI_API_KEY credential for OpenAI?')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This is the active provider. New requests may fail until you configure another credential.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockedDeleteProviderSecret).toHaveBeenCalledWith('secret_store:openai:OPENAI_API_KEY');
    });
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith('Credential deleted');
    });
    expect(
      await screen.findByText('No locally stored provider credentials were found.')
    ).toBeInTheDocument();
  });

  it('configures the permanent Hugging Face credential row', async () => {
    const user = userEvent.setup();
    const huggingFaceSecret: ProviderSecretDto = {
      id: 'provider_cache:huggingface',
      provider: 'huggingface',
      providerDisplayName: 'Hugging Face',
      name: 'OAuth token',
      storage: 'provider_cache',
      expiresAt: null,
      status: 'unknown',
      configured: false,
      hasSecret: false,
      canDelete: false,
      canConfigure: true,
      configureProvider: 'huggingface',
    };

    mockedListProviderSecrets.mockResolvedValueOnce([huggingFaceSecret]).mockResolvedValueOnce([
      {
        ...huggingFaceSecret,
        configured: true,
        hasSecret: true,
        canDelete: true,
      },
    ]);

    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('Hugging Face')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete credential' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockedAcpAuthenticateProvider).toHaveBeenCalledWith('huggingface');
    });
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith('Credential configured');
    });
  });

  it('shows the GitHub account as connected when the token exists', async () => {
    mockedAcpReadConfig.mockResolvedValue({ maskedValue: 'gho_****' });

    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows the GitHub account as not connected by default', async () => {
    renderWithIntl(<AuthSettingsSection />);

    expect(await screen.findByText('Not connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
  });

  it('runs the GitHub device flow and stores the token on success', async () => {
    const user = userEvent.setup();
    const electron = window.electron as unknown as {
      githubDeviceStart: ReturnType<typeof vi.fn>;
      githubDevicePoll: ReturnType<typeof vi.fn>;
    };
    electron.githubDeviceStart.mockResolvedValue({
      deviceCode: 'device-secret',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      verificationUriComplete: null,
      expiresIn: 899,
      interval: 1,
    });
    electron.githubDevicePoll.mockResolvedValue({
      status: 'ok',
      accessToken: 'gho_test_token',
    });

    renderWithIntl(<AuthSettingsSection />);

    await user.click(await screen.findByRole('button', { name: 'Sign in with GitHub' }));

    expect(electron.githubDeviceStart).toHaveBeenCalled();
    expect(await screen.findByText('ABCD-1234')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockedAcpUpsertConfig).toHaveBeenCalledWith(
          'GITHUB_PERSONAL_ACCESS_TOKEN',
          'gho_test_token',
          true
        );
      },
      { timeout: 4000 }
    );
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Signed in to GitHub. The GitHub extension is ready to use.'
      );
    });
    expect(await screen.findByText('Connected')).toBeInTheDocument();
  });

  it('signs out of GitHub after confirmation', async () => {
    const user = userEvent.setup();
    mockedAcpReadConfig.mockResolvedValue({ maskedValue: 'gho_****' });

    renderWithIntl(<AuthSettingsSection />);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Sign out' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockedAcpRemoveConfig).toHaveBeenCalledWith('GITHUB_PERSONAL_ACCESS_TOKEN', true);
    });
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith('Signed out of GitHub');
    });
  });
});
