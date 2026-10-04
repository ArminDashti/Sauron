import { describe, expect, it } from 'vitest';
import { resolveModelIcon } from './modelIcons';
import { resolveProviderIcon } from './providerIcons';

describe('resolveModelIcon', () => {
  it('gives aggregated models their own vendor mark, not the gateway mark', () => {
    expect(resolveModelIcon('openai/gpt-5')).toBe(resolveProviderIcon('openai'));
    expect(resolveModelIcon('anthropic/claude-sonnet-4')).toBe(resolveProviderIcon('anthropic'));
    expect(resolveModelIcon('meta/llama-3.3-70b-instruct:free')).toBe(resolveProviderIcon('meta'));
    expect(resolveModelIcon('deepseek/deepseek-chat')).toBe(resolveProviderIcon('deepseek'));
    expect(resolveModelIcon('google/gemini-2.5-pro')).toBe(resolveProviderIcon('google'));
  });

  it('keeps two rows of the same aggregator on different marks', () => {
    const openai = resolveModelIcon('openai/gpt-5');
    const anthropic = resolveModelIcon('anthropic/claude-sonnet-4');
    expect(openai).toBeTruthy();
    expect(anthropic).toBeTruthy();
    expect(openai).not.toBe(anthropic);
    expect(openai).not.toBe(resolveProviderIcon('openrouter'));
  });

  it('resolves vendor aliases and nested ids', () => {
    expect(resolveModelIcon('moonshotai/kimi-k2.5')).toBe(resolveProviderIcon('moonshot'));
    expect(resolveModelIcon('qwen/qwen3.7-max')).toBe(resolveProviderIcon('alibaba'));
    expect(resolveModelIcon('zaiorg/glm-5')).toBe(resolveProviderIcon('zhipu'));
    expect(resolveModelIcon('metalamazon/llama-4-scout')).toBe(resolveProviderIcon('meta'));
    expect(resolveModelIcon('openrouter/openai/gpt-4o')).toBe(resolveProviderIcon('openai'));
  });

  it('matches bare ids by family prefix, longest prefix first', () => {
    expect(resolveModelIcon('gpt-5.4-mini')).toBe(resolveProviderIcon('openai'));
    expect(resolveModelIcon('gptoss120b')).toBe(resolveProviderIcon('openai'));
    expect(resolveModelIcon('text-embedding-3-large')).toBe(resolveProviderIcon('openai'));
    expect(resolveModelIcon('dall-e-3')).toBe(resolveProviderIcon('openai'));
    expect(resolveModelIcon('claude-opus-4-6')).toBe(resolveProviderIcon('anthropic'));
    expect(resolveModelIcon('gemini-3-flash-preview')).toBe(resolveProviderIcon('google'));
    expect(resolveModelIcon('llama-3.1-8b-instant')).toBe(resolveProviderIcon('meta'));
    expect(resolveModelIcon('mistral-large-latest')).toBe(resolveProviderIcon('mistral'));
    expect(resolveModelIcon('command-r-plus')).toBe(resolveProviderIcon('cohere'));
  });

  it('returns undefined when the id names no family, so the caller can fall back', () => {
    expect(resolveModelIcon('auto')).toBeUndefined();
    expect(resolveModelIcon('orcarouter/fusion-mini')).toBeUndefined();
    expect(resolveModelIcon('')).toBeUndefined();
    expect(resolveModelIcon(null)).toBeUndefined();
    expect(resolveModelIcon(undefined)).toBeUndefined();
  });

  it('uses the provider mark only when the model is unrecognised', () => {
    expect(resolveModelIcon('space-bunny-free') ?? resolveProviderIcon('opencode_go')).toBe(
      resolveProviderIcon('opencode_go')
    );
  });
});
