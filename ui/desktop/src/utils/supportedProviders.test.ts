import { describe, expect, it } from 'vitest';
import {
  filterSupportedProviders,
  isSupportedProvider,
  sortBySupportedProvider,
  SUPPORTED_PROVIDER_ORDER,
  supportedProviderRank,
} from './supportedProviders';

const named = (...names: string[]) => names.map((name) => ({ name }));

describe('supportedProviders', () => {
  it('accepts every provider the app offers', () => {
    const offered = [
      'openai',
      'anthropic',
      'opencode_go',
      'opencode_zen',
      'openrouter',
      'google',
      'ollama',
      'mistral',
      'huggingface',
    ];

    expect(offered.every(isSupportedProvider)).toBe(true);
  });

  it('accepts Hugging Face and filters out Tensorix', () => {
    expect(isSupportedProvider('huggingface')).toBe(true);
    expect(isSupportedProvider('custom_tensorix')).toBe(false);
    expect(isSupportedProvider('huggingface')).toBe(true);
  });

  it('accepts user-created OpenAI-compatible providers under any custom id', () => {
    expect(isSupportedProvider('custom_openai_compatible')).toBe(true);
    expect(isSupportedProvider('custom_my_endpoint')).toBe(true);
    expect(isSupportedProvider('CUSTOM_Upper')).toBe(true);
  });

  it('rejects providers outside the allowlist', () => {
    expect(isSupportedProvider('deepseek')).toBe(false);
    expect(isSupportedProvider('github_copilot')).toBe(false);
    expect(isSupportedProvider('customary')).toBe(false);
    expect(isSupportedProvider('')).toBe(false);
  });

  it('filters an inventory down to the allowlist', () => {
    const inventory = named('deepseek', 'openai', 'custom_local', 'groq', 'mistral');

    expect(filterSupportedProviders(inventory).map((provider) => provider.name)).toEqual([
      'openai',
      'custom_local',
      'mistral',
    ]);
  });

  it('orders providers by the declared allowlist order', () => {
    const inventory = named('mistral', 'google', 'openai', 'custom_endpoint', 'opencode_go');

    expect(sortBySupportedProvider(inventory).map((provider) => provider.name)).toEqual([
      'openai',
      'opencode_go',
      'custom_endpoint',
      'google',
      'mistral',
    ]);
  });

  it('sorts unsupported providers after every supported one', () => {
    expect(supportedProviderRank('deepseek')).toBeGreaterThan(
      supportedProviderRank(SUPPORTED_PROVIDER_ORDER[SUPPORTED_PROVIDER_ORDER.length - 1])
    );
  });
});
