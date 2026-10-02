import type { RecentModel } from './settings';

const MAX_PREFERRED_MODELS = 10;

export function isPreferredModel(
  preferred: RecentModel[],
  provider: string,
  model: string
): boolean {
  return preferred.some((m) => m.provider === provider && m.model === model);
}

/**
 * Adds the model to the preferred list, or removes it when already present.
 * The most recently preferred model is kept first and the list is capped.
 */
export function addPreferredModel(
  preferred: RecentModel[],
  provider: string,
  model: string
): RecentModel[] {
  const filtered = preferred.filter((m) => !(m.provider === provider && m.model === model));
  return [{ provider, model }, ...filtered].slice(0, MAX_PREFERRED_MODELS);
}

export function removePreferredModel(
  preferred: RecentModel[],
  provider: string,
  model: string
): RecentModel[] {
  return preferred.filter((m) => !(m.provider === provider && m.model === model));
}
