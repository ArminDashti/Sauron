import { resolveProviderIcon } from './providerIcons';

/**
 * Distinct brand mark per model, for lists that mix model families inside one
 * provider -- an aggregator such as OpenRouter serves `openai/gpt-5`,
 * `anthropic/claude-sonnet-4` and `meta/llama-3.3-70b` side by side, so the
 * provider's own mark would be wrong on every row.
 *
 * Resolution order:
 * 1. `vendor/model` ids (OpenRouter, Vercel AI Gateway, ...): the model's own
 *    vendor mark, so the row that says `anthropic/...` shows Anthropic.
 * 2. First path segment, for ids that lead with the model family instead
 *    (`google/gemini-2.5-pro` is handled here too, since several providers
 *    publish under a vendor that is not the lab that trained the model).
 * 3. Family prefix on the bare model id, longest prefix first, so
 *    `gpt-oss-120b` and `text-embedding-3-large` both land on OpenAI.
 * 4. The provider's mark, when the model says nothing about its origin.
 */
const MODEL_VENDOR_PREFIXES: Record<string, string> = {
  openai: 'openai',
  azure: 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  google: 'google',
  gemini: 'google',
  vertex: 'google',
  vertexai: 'google',
  deepseek: 'deepseek',
  meta: 'meta',
  llama: 'meta',
  llamaindex: 'meta',
  mistralai: 'mistral',
  mistral: 'mistral',
  qwen: 'alibaba',
  alibaba: 'alibaba',
  qwenlm: 'alibaba',
  moonshotai: 'moonshot',
  moonshot: 'moonshot',
  kimi: 'moonshot',
  zai: 'zhipu',
  zaiorg: 'zhipu',
  zhipu: 'zhipu',
  zhipuai: 'zhipu',
  xai: 'xai',
  xaigrok: 'xai',
  cohere: 'cohere',
  cohereai: 'cohere',
  minimax: 'minimax',
  minimaxai: 'minimax',
  nvidia: 'nvidia',
  amazon: 'aws_bedrock',
  aws: 'aws_bedrock',
  microsoft: 'microsoft',
  microsoftphi: 'microsoft',
  nousresearch: 'meta',
  nousresearchai: 'meta',
  perplexity: 'perplexity',
  ai21: 'cohere',
  zerooneai: 'alibaba',
};

const MODEL_FAMILY_PREFIXES: Record<string, string> = {
  'gpt-image': 'openai',
  'gpt-oss': 'openai',
  'text-embedding': 'openai',
  gpt: 'openai',
  chatgpt: 'openai',
  'dall-e': 'openai',
  whisper: 'openai',
  sora: 'openai',
  claude: 'anthropic',
  anthropic: 'anthropic',
  gemini: 'google',
  gemma: 'google',
  palm: 'google',
  imagen: 'google',
  grok: 'xai',
  llama: 'meta',
  deepseek: 'deepseek',
  qwen: 'alibaba',
  qwq: 'alibaba',
  tongyi: 'alibaba',
  glm: 'zhipu',
  chatglm: 'zhipu',
  magistral: 'mistral',
  codestral: 'mistral',
  mixtral: 'mistral',
  mistral: 'mistral',
  devstral: 'mistral',
  pixtral: 'mistral',
  minimax: 'minimax',
  abab: 'minimax',
  command: 'cohere',
  aya: 'cohere',
  phi: 'microsoft',
  kimi: 'moonshot',
  moonshot: 'moonshot',
  llava: 'ollama',
};

const SORTED_FAMILY_PREFIXES = Object.entries(MODEL_FAMILY_PREFIXES).sort(
  ([a], [b]) => b.length - a.length
);

/**
 * Brand mark for a model, or undefined when the id names no family we know --
 * the caller then falls back to the provider's own mark.
 */
export function resolveModelIcon(model?: string | null): string | undefined {
  const id = (model ?? '').trim().toLowerCase();
  if (!id) return undefined;

  const parts = id
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  const vendor = parts.length > 1 ? parts[0] : '';
  if (vendor) {
    const vendorIcon = iconForVendor(vendor);
    if (vendorIcon) return vendorIcon;
  }

  const leaf = parts.length ? parts[parts.length - 1] : id;
  for (const [prefix, provider] of SORTED_FAMILY_PREFIXES) {
    if (leaf.startsWith(prefix)) {
      const icon = resolveProviderIcon(provider);
      if (icon) return icon;
    }
  }

  return undefined;
}

function iconForVendor(vendor: string): string | undefined {
  const canonical = MODEL_VENDOR_PREFIXES[vendor];
  if (canonical) {
    const icon = resolveProviderIcon(canonical);
    if (icon) return icon;
  }
  for (const [prefix, provider] of SORTED_FAMILY_PREFIXES) {
    if (vendor.startsWith(prefix)) {
      const icon = resolveProviderIcon(provider);
      if (icon) return icon;
    }
  }
  return undefined;
}
