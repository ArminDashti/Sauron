/**
 * Free-model detection shared by the Models settings section and the
 * model picker so both surfaces agree on which models cost nothing to run.
 *
 * A model is free when either:
 * - its provider runs inference on this machine (`local`, `ollama`), which the
 *   backend also treats as free by clearing catalog pricing, or
 * - it is a free-tier variant: OpenRouter's `:free` models or the `...-free`
 *   variants published by aggregators such as OpenCode.
 */

/** Providers whose inference runs locally, so no per-token API charge applies. */
const FREE_RUNTIME_PROVIDERS = new Set(['local', 'ollama']);

/** Free-tier variant suffixes: OpenRouter uses `:free`, other aggregators
 * (and OpenCode's gateway) publish free variants as `...-free`. */
const FREE_VARIANT_SUFFIXES = [':free', '-free'];

/** A provider's id paired with the model ids free detection runs over. */
export type FreeModelEntry = {
  models: string[];
  name: string;
};

/** Stable key identifying one model of one provider. */
export function modelKey(providerId: string, modelId: string): string {
  return `${providerId}\u0000${modelId}`;
}

/** Whether a model is known to be free to run. */
export function isKnownFreeModel(providerId: string, modelId: string): boolean {
  if (FREE_RUNTIME_PROVIDERS.has(providerId)) {
    return true;
  }
  const lower = modelId.toLowerCase();
  return FREE_VARIANT_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/** Keys for every model in `entries` that is known to be free. */
export function collectKnownFreeKeys(entries: FreeModelEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const entry of entries) {
    for (const model of entry.models) {
      if (isKnownFreeModel(entry.name, model)) {
        keys.add(modelKey(entry.name, model));
      }
    }
  }
  return keys;
}

/** Marks each model's `free` flag in place and returns the list for chaining. */
export function markFreeModels<M extends { free?: boolean; name: string }>(
  providerId: string,
  models: M[]
): M[] {
  for (const model of models) {
    model.free = isKnownFreeModel(providerId, model.name);
  }
  return models;
}
