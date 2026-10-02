import { describe, it, expect } from 'vitest';
import { addPreferredModel, isPreferredModel, removePreferredModel } from './preferredModels';
import type { RecentModel } from './settings';

describe('preferredModels', () => {
  it('detects whether a model is preferred', () => {
    const preferred: RecentModel[] = [{ provider: 'openai', model: 'gpt-5' }];
    expect(isPreferredModel(preferred, 'openai', 'gpt-5')).toBe(true);
    expect(isPreferredModel(preferred, 'anthropic', 'gpt-5')).toBe(false);
    expect(isPreferredModel([], 'openai', 'gpt-5')).toBe(false);
  });

  it('adds a model to the front of the list', () => {
    const initial: RecentModel[] = [{ provider: 'openai', model: 'gpt-5' }];
    const next = addPreferredModel(initial, 'anthropic', 'claude-sonnet-4-5');
    expect(next).toEqual([
      { provider: 'anthropic', model: 'claude-sonnet-4-5' },
      { provider: 'openai', model: 'gpt-5' },
    ]);
  });

  it('does not duplicate an already preferred model', () => {
    const initial: RecentModel[] = [{ provider: 'openai', model: 'gpt-5' }];
    const next = addPreferredModel(initial, 'openai', 'gpt-5');
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ provider: 'openai', model: 'gpt-5' });
  });

  it('caps the preferred list at 10 entries', () => {
    let preferred: RecentModel[] = [];
    for (let i = 0; i < 15; i++) {
      preferred = addPreferredModel(preferred, 'openai', `model-${i}`);
    }
    expect(preferred).toHaveLength(10);
    expect(preferred[0]).toEqual({ provider: 'openai', model: 'model-14' });
    expect(preferred.some((m) => m.model === 'model-4')).toBe(false);
  });

  it('removes a preferred model', () => {
    const initial: RecentModel[] = [
      { provider: 'openai', model: 'gpt-5' },
      { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    ];
    const next = removePreferredModel(initial, 'openai', 'gpt-5');
    expect(next).toEqual([{ provider: 'anthropic', model: 'claude-sonnet-4-5' }]);
  });

  it('keeps the list unchanged when removing a model that is not preferred', () => {
    const initial: RecentModel[] = [{ provider: 'openai', model: 'gpt-5' }];
    expect(removePreferredModel(initial, 'anthropic', 'claude-sonnet-4-5')).toEqual(initial);
  });
});
