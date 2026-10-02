import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllProviderModels from './AllProviderModels';
import {
  acpListSettingsProviderDetails,
  acpReadDefaults,
  acpSaveDefaults,
} from '../../../acp/providers';
import { toastError, toastSuccess } from '../../../toasts';
import { IntlTestWrapper } from '../../../i18n/test-utils';
import type { ProviderDetails } from '../../../types/providers';

vi.mock('../../../acp/providers', () => ({
  acpListSettingsProviderDetails: vi.fn(),
  acpReadDefaults: vi.fn(),
  acpRefreshProviderDetails: vi.fn(),
  acpSaveDefaults: vi.fn(),
}));

vi.mock('../../../toasts', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockedListSettingsProviderDetails = vi.mocked(acpListSettingsProviderDetails);
const mockedListReadDefaults = vi.mocked(acpReadDefaults);
const mockedSaveDefaults = vi.mocked(acpSaveDefaults);
const mockedToastSuccess = vi.mocked(toastSuccess);
const mockedToastError = vi.mocked(toastError);

const renderWithIntl = (ui: React.ReactElement) => render(ui, { wrapper: IntlTestWrapper });

function makeProvider(overrides: Partial<ProviderDetails> = {}): ProviderDetails {
  return {
    name: 'openai',
    is_configured: true,
    is_available: true,
    visible_in_setup: true,
    deprecated: false,
    provider_type: 'Builtin',
    uses_acp: false,
    metadata: {
      config_keys: [],
      default_model: 'gpt-4o',
      description: 'OpenAI models',
      display_name: 'OpenAI',
      known_models: [
        { name: 'gpt-4o', context_limit: 128000 },
        { name: 'o3-mini', context_limit: 204800, reasoning: true },
      ],
      model_doc_link: '',
      name: 'openai',
    },
    ...overrides,
  };
}

describe('AllProviderModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSettingsProviderDetails.mockResolvedValue([makeProvider()]);
    mockedListReadDefaults.mockResolvedValue({ providerId: 'openai', modelId: 'gpt-4o' });
    mockedSaveDefaults.mockResolvedValue(undefined);
  });

  it('renders configured providers with their models and marks the default', async () => {
    renderWithIntl(<AllProviderModels />);

    expect(await screen.findByTestId('all-provider-models-openai')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByTestId('all-provider-model-openai-gpt-4o')).toBeInTheDocument();
    expect(screen.getByTestId('all-provider-model-openai-o3-mini')).toBeInTheDocument();

    const current = screen.getByTestId('all-provider-model-openai-gpt-4o');
    expect(current).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows model metadata badges', async () => {
    renderWithIntl(<AllProviderModels />);

    await screen.findByTestId('all-provider-models-openai');
    expect(screen.getByText('125k')).toBeInTheDocument();
    expect(screen.getByText('200k')).toBeInTheDocument();
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
  });

  it('filters models by name and shows a filtered count', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AllProviderModels />);

    await screen.findByTestId('all-provider-models-openai');
    await user.type(screen.getByTestId('all-provider-models-search'), 'o3');

    await waitFor(() => {
      expect(screen.queryByTestId('all-provider-model-openai-gpt-4o')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('all-provider-model-openai-o3-mini')).toBeInTheDocument();
    expect(screen.getByTestId('all-provider-models-count')).toHaveTextContent(
      'Showing 1 of 2 models'
    );
  });

  it('filters by provider name to reveal all of its models', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AllProviderModels />);

    await screen.findByTestId('all-provider-models-openai');
    await user.type(screen.getByTestId('all-provider-models-search'), 'openai');

    expect(await screen.findByTestId('all-provider-model-openai-gpt-4o')).toBeInTheDocument();
    expect(screen.getByTestId('all-provider-model-openai-o3-mini')).toBeInTheDocument();
  });

  it('shows an empty search state with a way to clear the query', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AllProviderModels />);

    await screen.findByTestId('all-provider-models-openai');
    await user.type(screen.getByTestId('all-provider-models-search'), 'does-not-exist');

    expect(await screen.findByText('No models match "does-not-exist".')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findByTestId('all-provider-model-openai-gpt-4o')).toBeInTheDocument();
    expect(screen.queryByText(/No models match/)).not.toBeInTheDocument();
  });

  it('saves the selected model as default and notifies the parent', async () => {
    const user = userEvent.setup();
    const onModelSelected = vi.fn();
    renderWithIntl(<AllProviderModels onModelSelected={onModelSelected} />);

    await screen.findByTestId('all-provider-models-openai');
    await user.click(screen.getByTestId('all-provider-model-openai-o3-mini'));

    await waitFor(() => {
      expect(mockedSaveDefaults).toHaveBeenCalledWith('openai', 'o3-mini');
    });
    expect(mockedToastSuccess).toHaveBeenCalled();
    expect(onModelSelected).toHaveBeenCalledTimes(1);

    const selected = screen.getByTestId('all-provider-model-openai-o3-mini');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('all-provider-model-openai-gpt-4o')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('shows a toast when saving the default model fails', async () => {
    const user = userEvent.setup();
    mockedSaveDefaults.mockRejectedValue(new Error('nope'));
    renderWithIntl(<AllProviderModels />);

    await screen.findByTestId('all-provider-models-openai');
    await user.click(screen.getByTestId('all-provider-model-openai-o3-mini'));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalled();
    });
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });

  it('renders the empty state when no providers are configured', async () => {
    mockedListSettingsProviderDetails.mockResolvedValue([]);
    renderWithIntl(<AllProviderModels />);

    expect(await screen.findByText('No activated providers yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure providers' })).toBeInTheDocument();
  });
});
