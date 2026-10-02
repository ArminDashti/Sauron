import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AllProviderModels from './AllProviderModels';
import { IntlTestWrapper } from '../../../i18n/test-utils';
import type { ProviderDetails } from '../../../types/providers';

const mockListSettingsProviderDetails = vi.fn();
const mockReadDefaults = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../acp/providers', () => ({
  acpListSettingsProviderDetails: (...args: unknown[]) => mockListSettingsProviderDetails(...args),
  acpReadDefaults: (...args: unknown[]) => mockReadDefaults(...args),
  acpRefreshProviderDetails: vi.fn(),
  acpSaveDefaults: vi.fn(),
}));

vi.mock('../../../toasts', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const renderSection = () =>
  render(<AllProviderModels preferredModels={[]} onPreferredModelsChange={vi.fn()} />, {
    wrapper: IntlTestWrapper,
  });

function createProvider(
  name: string,
  displayName: string,
  models: { context_limit?: number; name: string }[]
): ProviderDetails {
  return {
    name,
    is_configured: true,
    is_available: true,
    visible_in_setup: true,
    deprecated: false,
    provider_type: 'Builtin',
    uses_acp: false,
    metadata: {
      name,
      display_name: displayName,
      description: '',
      default_model: '',
      model_doc_link: '',
      config_keys: [],
      known_models: models,
    },
  };
}

const openrouter = createProvider('openrouter', 'OpenRouter', [
  { name: 'openai/gpt-5', context_limit: 400_000 },
  { name: 'meta/llama-3.3-70b-instruct:free', context_limit: 131_072 },
]);
const anthropic = createProvider('anthropic', 'Anthropic', [
  { name: 'claude-sonnet-4-5', context_limit: 200_000 },
]);
const local = createProvider('local', 'Local models', [{ name: 'Qwen/Qwen3-8B' }]);

describe('AllProviderModels free filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockListSettingsProviderDetails.mockResolvedValue([openrouter, anthropic, local]);
    mockReadDefaults.mockResolvedValue({ providerId: 'openrouter', modelId: 'openai/gpt-5' });
  });

  it('shows free badges and per-provider free counts alongside all models', async () => {
    renderSection();

    expect(await screen.findByTestId('models-filter-all')).toHaveTextContent('4');
    expect(screen.getByTestId('models-filter-free')).toHaveTextContent('2');
    expect(screen.getAllByTestId('model-free-badge')).toHaveLength(2);
    expect(screen.getByTestId('provider-free-count-openrouter')).toHaveTextContent('1 free');
    expect(screen.getByTestId('provider-free-count-local')).toHaveTextContent('1 free');
    expect(screen.queryByTestId('provider-free-count-anthropic')).toBeNull();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
  });

  it('filters down to free models per provider when Free is selected', async () => {
    renderSection();
    fireEvent.click(await screen.findByTestId('models-filter-free'));

    expect(screen.getByTestId('models-filter-free')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('meta/llama-3.3-70b-instruct:free')).toBeInTheDocument();
    expect(screen.getByText('Qwen/Qwen3-8B')).toBeInTheDocument();
    expect(screen.queryByTestId('all-provider-models-anthropic')).toBeNull();
    expect(screen.queryByText('openai/gpt-5')).toBeNull();
    expect(screen.queryByText('claude-sonnet-4-5')).toBeNull();
    expect(localStorage.getItem('modelsFreeOnly')).toBe('true');
  });

  it('restores all models when All is selected again', async () => {
    renderSection();
    fireEvent.click(await screen.findByTestId('models-filter-free'));
    fireEvent.click(screen.getByTestId('models-filter-all'));

    expect(screen.getByTestId('models-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('all-provider-models-anthropic')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(localStorage.getItem('modelsFreeOnly')).toBe('false');
  });

  it('offers a way back when no provider reports free models', async () => {
    mockListSettingsProviderDetails.mockResolvedValue([anthropic]);
    renderSection();
    fireEvent.click(await screen.findByTestId('models-filter-free'));

    expect(screen.getByText('No free models from your providers.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all models' }));

    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByTestId('models-filter-all')).toHaveAttribute('aria-pressed', 'true');
  });

  it('remembers the Free filter across remounts', async () => {
    localStorage.setItem('modelsFreeOnly', 'true');
    renderSection();

    expect(await screen.findByTestId('models-filter-free')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('openai/gpt-5')).toBeNull();
  });
});
