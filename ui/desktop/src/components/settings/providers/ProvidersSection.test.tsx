import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acpListSettingsProviderDetails,
  acpReadProviderConfig,
  acpRefreshProviderDetails,
  acpSaveProviderConfig,
} from '../../../acp/providers';
import { IntlTestWrapper } from '../../../i18n/test-utils';
import type { ProviderDetails } from '../../../types/providers';
import ProvidersSection from './ProvidersSection';

vi.mock('../../../acp/providers', () => ({
  acpListSettingsProviderDetails: vi.fn(),
  acpReadProviderConfig: vi.fn(),
  acpRefreshProviderDetails: vi.fn(),
  acpSaveDefaults: vi.fn(),
  acpSaveProviderConfig: vi.fn(),
}));

vi.mock('../../../contexts/FeaturesContext', () => ({
  useFeatures: () => ({ localInference: false }),
}));
vi.mock('../models/ModelsSection', () => ({ default: () => null }));
vi.mock('../localInference/LocalInferenceSection', () => ({ default: () => null }));
vi.mock('../reset_provider/ResetProviderSection', () => ({ default: () => null }));
vi.mock('./modal/ProviderConfigurationModal', () => ({ default: () => null }));
vi.mock('../../logos/BrandLogos', () => ({ BrandIcon: () => null }));

const mistralProvider = providerDetails('mistral', 'Mistral', [
  {
    name: 'MISTRAL_API_KEY',
    required: true,
    primary: true,
    secret: true,
    oauth_flow: false,
  },
  { name: 'MISTRAL_HOST', required: false, secret: false, oauth_flow: false },
]);

const openRouterProvider = providerDetails('openrouter', 'OpenRouter', [
  {
    name: 'OPENROUTER_API_KEY',
    required: true,
    primary: true,
    secret: true,
    oauth_flow: false,
  },
]);

function providerDetails(
  name: string,
  displayName: string,
  config_keys: ProviderDetails['metadata']['config_keys']
): ProviderDetails {
  return {
    name,
    is_configured: false,
    is_available: true,
    visible_in_setup: true,
    deprecated: false,
    provider_type: 'Builtin',
    uses_acp: false,
    metadata: {
      name,
      display_name: displayName,
      description: `${displayName} models`,
      default_model: '',
      model_doc_link: '',
      config_keys,
      known_models: [],
    },
  };
}

describe('ProvidersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(acpListSettingsProviderDetails).mockResolvedValue([
      mistralProvider,
      openRouterProvider,
    ]);
    vi.mocked(acpReadProviderConfig).mockResolvedValue([]);
    vi.mocked(acpSaveProviderConfig).mockResolvedValue(undefined);
    vi.mocked(acpRefreshProviderDetails).mockImplementation(async (providerId) => ({
      provider: providerId === 'openrouter' ? openRouterProvider : mistralProvider,
      connectionChecked: true,
      readinessError: null,
    }));
  });

  it('shows selected provider fields and saves values through ACP', async () => {
    const user = userEvent.setup();
    render(<ProvidersSection setView={vi.fn()} />, { wrapper: IntlTestWrapper });

    // Providers are alphabetized by their displayed names.
    const apiKey = (await screen.findByLabelText('API Key', { exact: false })) as HTMLInputElement;
    expect(apiKey).toBeRequired();

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('MISTRAL_API_KEY is required')).toBeInTheDocument();
    expect(acpSaveProviderConfig).not.toHaveBeenCalled();

    await user.type(apiKey, 'test-mistral-key');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(acpSaveProviderConfig).toHaveBeenCalledWith('mistral', [
        { key: 'MISTRAL_API_KEY', value: 'test-mistral-key' },
      ])
    );
    await waitFor(() => expect(acpRefreshProviderDetails).toHaveBeenCalledWith('mistral'));

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /OpenRouter/ }));

    expect(await screen.findByLabelText(/OpenRouter API Key/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mistral API Key/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure' })).toBeInTheDocument();
  });
});
