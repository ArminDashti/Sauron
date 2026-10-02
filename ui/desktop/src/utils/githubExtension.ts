import {
  addConfigExtension,
  getConfiguredExtensions,
  setConfigExtensionEnabled,
} from '../acp/extensions';
import type { ExtensionConfig } from '../types/extensions';
import bundledExtensionsData from '../components/settings/extensions/bundled-extensions.json';
import { nameToKey } from '../components/settings/extensions/utils';

export const BUNDLED_GITHUB_EXTENSION_ID = 'github';
export const BUNDLED_GITHUB_MCP_URI = 'https://api.githubcopilot.com/mcp/';

type BundledExtension = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'builtin' | 'stdio' | 'streamable_http';
  uri?: string;
  env_keys?: string[];
  headers?: { [key: string]: string };
  timeout?: number;
};

function bundledGitHubCatalogEntry(): BundledExtension | undefined {
  return (bundledExtensionsData as BundledExtension[]).find(
    (entry) => entry.id === BUNDLED_GITHUB_EXTENSION_ID
  );
}

function isBundledGitHubExtension(entry: {
  name: string;
  type?: string;
  uri?: string;
  bundled?: boolean;
}): boolean {
  if (nameToKey(entry.name) !== BUNDLED_GITHUB_EXTENSION_ID) {
    return false;
  }
  if (entry.type === 'streamable_http' && entry.uri === BUNDLED_GITHUB_MCP_URI) {
    return true;
  }
  return entry.bundled === true && entry.type === 'streamable_http';
}

function catalogToExtensionConfig(entry: BundledExtension): ExtensionConfig {
  if (entry.type !== 'streamable_http') {
    throw new Error('Bundled GitHub extension must be streamable_http');
  }
  return {
    type: 'streamable_http',
    name: entry.name,
    description: entry.description,
    uri: entry.uri || BUNDLED_GITHUB_MCP_URI,
    env_keys: entry.env_keys || [],
    headers: entry.headers || {},
    timeout: entry.timeout ?? 300,
    bundled: true,
  };
}

/**
 * Enable or disable only the bundled GitHub MCP extension.
 * Adds it from the catalog when missing. Leaves a custom same-name extension alone.
 */
export async function setBundledGitHubExtensionEnabled(enabled: boolean): Promise<void> {
  const catalog = bundledGitHubCatalogEntry();
  if (!catalog) {
    return;
  }

  const { extensions } = await getConfiguredExtensions();
  const bundled = extensions.find((ext) => isBundledGitHubExtension(ext));

  if (bundled) {
    if (bundled.enabled !== enabled) {
      await setConfigExtensionEnabled(bundled.configKey ?? nameToKey(bundled.name), enabled);
    }
    return;
  }

  const sameKey = extensions.find((ext) => nameToKey(ext.name) === BUNDLED_GITHUB_EXTENSION_ID);
  if (sameKey) {
    // Custom extension that only shares the catalog id — do not overwrite it.
    return;
  }

  if (enabled) {
    await addConfigExtension(catalogToExtensionConfig(catalog), true);
  }
}
