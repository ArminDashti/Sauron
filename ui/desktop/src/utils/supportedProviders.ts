/**
 * Synthetic slot for OpenAI-compatible endpoints. The backend models those as
 * user-created custom providers whose ids are prefixed `custom_`, so the slot
 * is not a real provider id — it only places them in presentation order.
 */
export const CUSTOM_PROVIDER_SLOT = 'custom';

/**
 * Model providers the desktop app offers today. The backend registry exposes
 * many more providers; this list — not the provider inventory — decides what
 * the provider surfaces show. The custom slot keeps user-created providers
 * selectable.
 */
export const SUPPORTED_PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'opencode_go',
  'opencode_zen',
  'openrouter',
  CUSTOM_PROVIDER_SLOT,
  'google',
  'ollama',
  'mistral',
  'huggingface',
] as const;

const UNSUPPORTED_RANK = Number.MAX_SAFE_INTEGER;

export function isCustomProvider(name: string): boolean {
  return name.trim().toLowerCase().startsWith('custom_');
}

/** True when the provider id names something the app is allowed to offer. */
export function isSupportedProvider(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'custom_tensorix') return false;
  if (isCustomProvider(normalized)) return true;
  return (SUPPORTED_PROVIDER_ORDER as readonly string[]).includes(normalized);
}

/**
 * Presentation rank for a provider id. Unsupported providers sort last so a
 * caller that only sorts still holds the allowlist together.
 */
export function supportedProviderRank(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'custom_tensorix') return UNSUPPORTED_RANK;
  if (isCustomProvider(normalized)) {
    return (SUPPORTED_PROVIDER_ORDER as readonly string[]).indexOf(CUSTOM_PROVIDER_SLOT);
  }
  const index = (SUPPORTED_PROVIDER_ORDER as readonly string[]).indexOf(normalized);
  return index === -1 ? UNSUPPORTED_RANK : index;
}

export function filterSupportedProviders<T extends { name: string }>(providers: T[]): T[] {
  return providers.filter((provider) => isSupportedProvider(provider.name));
}

export function sortBySupportedProvider<T extends { name: string }>(providers: T[]): T[] {
  return [...providers].sort(
    (a, b) => supportedProviderRank(a.name) - supportedProviderRank(b.name)
  );
}
