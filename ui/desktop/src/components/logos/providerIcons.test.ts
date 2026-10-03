import { describe, expect, it } from 'vitest';
import {
  isKnownProvider,
  providerAccent,
  providerMonogram,
  resolveProviderIcon,
  resolveProviderLabel,
} from './providerIcons';

describe('resolveProviderIcon', () => {
  it('returns a vendored mark for providers that publish one', () => {
    expect(resolveProviderIcon('openai')).toBeTruthy();
    expect(resolveProviderIcon('anthropic')).toBeTruthy();
    expect(resolveProviderIcon('gcp_vertex_ai')).toBeTruthy();
    expect(resolveProviderIcon('custom_tensorix')).toBeUndefined();
  });

  it('normalises case and surrounding whitespace', () => {
    expect(resolveProviderIcon('  OpenRouter  ')).toBe(resolveProviderIcon('openrouter'));
  });

  it('resolves aliases onto the canonical provider mark', () => {
    expect(resolveProviderIcon('bedrock')).toBe(resolveProviderIcon('aws_bedrock'));
    expect(resolveProviderIcon('gemini')).toBe(resolveProviderIcon('gemini_oauth'));
    expect(resolveProviderIcon('vertexai')).toBe(resolveProviderIcon('gcp_vertex_ai'));
  });

  it('returns undefined for providers with no brand mark', () => {
    expect(resolveProviderIcon('routstr')).toBeUndefined();
    expect(resolveProviderIcon('acme')).toBeUndefined();
    expect(resolveProviderIcon(null)).toBeUndefined();
    expect(resolveProviderIcon('')).toBeUndefined();
  });
});

describe('isKnownProvider', () => {
  it('is true for both branded and unbranded providers', () => {
    expect(isKnownProvider('openai')).toBe(true);
    expect(isKnownProvider('routstr')).toBe(true);
  });

  it('is false for ids we have never heard of', () => {
    expect(isKnownProvider('acme')).toBe(false);
    expect(isKnownProvider(null)).toBe(false);
  });
});

describe('resolveProviderLabel', () => {
  it('uses the curated display name for unbranded providers', () => {
    expect(resolveProviderLabel('nano-gpt')).toBe('NanoGPT');
    expect(resolveProviderLabel('local')).toBe('Local Inference');
  });

  it('falls back to the id when no display name is curated', () => {
    expect(resolveProviderLabel('openai')).toBe('openai');
  });
});

describe('providerMonogram', () => {
  it('takes the first letter of each of the first two words', () => {
    expect(providerMonogram('nano-gpt')).toBe('NG');
    expect(providerMonogram('llama_swap')).toBe('LS');
    expect(providerMonogram('local')).toBe('LI');
  });

  it('uses a single letter for single-word names', () => {
    expect(providerMonogram('routstr')).toBe('R');
  });

  it('never returns an empty string', () => {
    expect(providerMonogram('111')).toBeTruthy();
    expect(providerMonogram(null)).toBeTruthy();
  });
});

describe('providerAccent', () => {
  it('is stable for the same provider', () => {
    expect(providerAccent('routstr')).toBe(providerAccent('routstr'));
  });

  it('differs between providers', () => {
    expect(providerAccent('routstr')).not.toBe(providerAccent('saygm'));
  });
});
