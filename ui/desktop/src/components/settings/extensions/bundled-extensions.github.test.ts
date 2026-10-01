import { describe, it, expect, vi } from 'vitest';
import { syncBundledExtensions } from './bundled-extensions';
import bundledExtensions from './bundled-extensions.json';
import type { FixedExtensionEntry } from '../../ConfigContext';

type CatalogEntry = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  uri?: string;
  env_keys?: string[];
  headers?: Record<string, string>;
  timeout?: number;
  bundled?: boolean;
};

const entries = bundledExtensions as CatalogEntry[];

describe('bundled GitHub extension', () => {
  const github = entries.find((entry) => entry.id === 'github');

  it('exists and targets the remote GitHub MCP endpoint', () => {
    expect(github).toMatchObject({
      name: 'GitHub',
      type: 'streamable_http',
      uri: 'https://api.githubcopilot.com/mcp/',
      enabled: false,
      bundled: true,
    });
  });

  it('authenticates with a personal access token resolved from env or secret store', () => {
    expect(github?.env_keys).toEqual(['GITHUB_PERSONAL_ACCESS_TOKEN']);
    expect(github?.headers).toEqual({
      Authorization: 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}',
    });
  });

  it('syncs into config with headers and env keys preserved', async () => {
    const addExtensionFn = vi.fn().mockResolvedValue(undefined);

    await syncBundledExtensions([] as FixedExtensionEntry[], addExtensionFn);

    expect(addExtensionFn).toHaveBeenCalledWith(
      'GitHub',
      expect.objectContaining({
        type: 'streamable_http',
        uri: 'https://api.githubcopilot.com/mcp/',
        env_keys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
        headers: { Authorization: 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}' },
        bundled: true,
      }),
      false
    );
  });
});
