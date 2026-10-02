import { describe, expect, it } from 'vitest';
import { collectKnownFreeKeys, isKnownFreeModel, markFreeModels, modelKey } from './freeModels';

describe('isKnownFreeModel', () => {
  it('marks models from local runtimes as free', () => {
    expect(isKnownFreeModel('local', 'Qwen/Qwen3-8B')).toBe(true);
    expect(isKnownFreeModel('ollama', 'llama3')).toBe(true);
  });

  it('does not mark cloud provider models as free by provider alone', () => {
    expect(isKnownFreeModel('openai', 'gpt-4o')).toBe(false);
    expect(isKnownFreeModel('anthropic', 'claude-sonnet-4-5')).toBe(false);
  });

  it('marks :free variants as free regardless of provider', () => {
    expect(isKnownFreeModel('openrouter', 'meta/llama-3.3-70b-instruct:free')).toBe(true);
    expect(isKnownFreeModel('openrouter', 'qwen/qwen3-coder:FREE')).toBe(true);
  });

  it('marks -free suffix variants as free regardless of provider', () => {
    expect(isKnownFreeModel('opencode-go', 'longcat-2.5-preview-free')).toBe(true);
    expect(isKnownFreeModel('opencode-zen', 'mimo-v2.5-free')).toBe(true);
    expect(isKnownFreeModel('opencode-zen', 'DEEPSEEK-V4-FLASH-FREE')).toBe(true);
  });

  it('does not treat names that merely contain "free" as free', () => {
    expect(isKnownFreeModel('openrouter', 'free')).toBe(false);
    expect(isKnownFreeModel('openrouter', 'freedom-latest')).toBe(false);
    expect(isKnownFreeModel('openrouter', 'freakyfors-7b')).toBe(false);
  });
});

describe('collectKnownFreeKeys', () => {
  it('collects keys only for free models of each provider', () => {
    const keys = collectKnownFreeKeys([
      { name: 'openrouter', models: ['openai/gpt-5', 'meta/llama-3.3-70b:free'] },
      { name: 'ollama', models: ['qwen3'] },
      { name: 'anthropic', models: ['claude-sonnet-4-5'] },
    ]);

    expect(keys).toEqual(
      new Set([modelKey('openrouter', 'meta/llama-3.3-70b:free'), modelKey('ollama', 'qwen3')])
    );
  });

  it('keeps providers separated even when model names collide', () => {
    const keys = collectKnownFreeKeys([
      { name: 'ollama', models: ['llama3'] },
      { name: 'openai', models: ['llama3'] },
    ]);

    expect(keys.has(modelKey('ollama', 'llama3'))).toBe(true);
    expect(keys.has(modelKey('openai', 'llama3'))).toBe(false);
  });
});

describe('markFreeModels', () => {
  it('annotates each model with its free flag and returns the list', () => {
    const input: { free?: boolean; name: string }[] = [
      { name: 'openai/gpt-5' },
      { name: 'meta/llama-3.3-70b:free' },
    ];
    const models = markFreeModels('openrouter', input);

    expect(models.map((model) => model.free)).toEqual([false, true]);
  });
});
