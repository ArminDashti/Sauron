import React from 'react';
import ProviderMonogram from './ProviderMonogram';
import { isKnownProvider, resolveProviderIcon } from './providerIcons';

/**
 * Brand marks for providers (companies) and models.
 *
 * Resolution order: a real vendored SVG mark for the provider, then the
 * hand-drawn 32x32 tile below (used for providers with no public logo and for
 * model-name matching), then initials for known providers, and finally the
 * Sauron eye for ids we do not recognise. Because the tile is 32x32 and the
 * vendored SVGs are square, icons line up in grids, lists, and dropdowns.
 */

type BrandMark = React.FC<{ className?: string }>;

const Tile: React.FC<{ fill: string; className?: string; children?: React.ReactNode }> = ({
  fill,
  className,
  children,
}) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill={fill} stroke="rgba(0,0,0,0.08)" />
    {children}
  </svg>
);

/* ---------------------------------------------------------------- company marks */

const OpenAI: BrandMark = ({ className }) => (
  <Tile fill="#10A37F" className={className}>
    <g fill="#ffffff">
      <circle cx="16" cy="9.6" r="4.7" />
      <circle cx="21.6" cy="12.8" r="4.7" />
      <circle cx="21.6" cy="19.2" r="4.7" />
      <circle cx="16" cy="22.4" r="4.7" />
      <circle cx="10.4" cy="19.2" r="4.7" />
      <circle cx="10.4" cy="12.8" r="4.7" />
    </g>
    <circle cx="16" cy="16" r="4.2" fill="#10A37F" />
  </Tile>
);

const Anthropic: BrandMark = ({ className }) => (
  <Tile fill="#D97757" className={className}>
    <g stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round">
      <line x1="16" y1="5.5" x2="16" y2="13" />
      <line x1="16" y1="19" x2="16" y2="26.5" />
      <line x1="5.5" y1="16" x2="13" y2="16" />
      <line x1="19" y1="16" x2="26.5" y2="16" />
      <line x1="8.6" y1="8.6" x2="13.9" y2="13.9" />
      <line x1="18.1" y1="18.1" x2="23.4" y2="23.4" />
      <line x1="23.4" y1="8.6" x2="18.1" y2="13.9" />
      <line x1="13.9" y1="18.1" x2="8.6" y2="23.4" />
    </g>
  </Tile>
);

const Google: BrandMark = ({ className }) => (
  <Tile fill="#F8F9FA" className={className}>
    <g fill="none" strokeWidth="4.6">
      <path d="M23.26 9.88 A9.5 9.5 0 0 0 9.32 9.32" stroke="#EA4335" />
      <path d="M9.32 9.32 A9.5 9.5 0 0 0 9.32 22.68" stroke="#FBBC05" />
      <path d="M9.32 22.68 A9.5 9.5 0 0 0 22.68 22.68" stroke="#34A853" />
      <path d="M22.68 22.68 A9.5 9.5 0 0 0 25.5 16" stroke="#4285F4" />
    </g>
    <rect x="15.6" y="13.7" width="10" height="4.6" rx="0.6" fill="#4285F4" />
  </Tile>
);

const Gemini: BrandMark = ({ className }) => (
  <Tile fill="#FFFFFF" className={className}>
    <defs>
      <linearGradient id="gemini-spark" x1="6" y1="26" x2="26" y2="6">
        <stop offset="0%" stopColor="#4E82EE" />
        <stop offset="50%" stopColor="#9B72F2" />
        <stop offset="100%" stopColor="#D9659B" />
      </linearGradient>
    </defs>
    <path
      d="M16 4.5 C17.7 11.2 20.8 14.3 27.5 16 C20.8 17.7 17.7 20.8 16 27.5 C14.3 20.8 11.2 17.7 4.5 16 C11.2 14.3 14.3 11.2 16 4.5 Z"
      fill="url(#gemini-spark)"
    />
  </Tile>
);

const Xai: BrandMark = ({ className }) => (
  <Tile fill="#0B0B0B" className={className}>
    <g stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round">
      <line x1="9.5" y1="7.5" x2="22.5" y2="24.5" />
      <line x1="22.5" y1="7.5" x2="9.5" y2="24.5" />
    </g>
  </Tile>
);

const Groq: BrandMark = ({ className }) => (
  <Tile fill="#FF4A00" className={className}>
    <path
      d="M22.14 9.04 A9.5 9.5 0 1 0 25.5 16"
      fill="none"
      stroke="#ffffff"
      strokeWidth="4.4"
    />
    <rect x="15.6" y="13.7" width="9.6" height="4.6" rx="0.6" fill="#ffffff" />
  </Tile>
);

const Ollama: BrandMark = ({ className }) => (
  <Tile fill="#17121F" className={className}>
    <g fill="#ffffff">
      <ellipse cx="14.5" cy="20.5" rx="7" ry="4.6" />
      <rect x="11.4" y="22" width="2.6" height="5" rx="1.2" />
      <rect x="18.6" y="22" width="2.6" height="5" rx="1.2" />
      <path d="M18.5 22 L18.5 14 C18.5 11.2 20.4 9 23 9 C25.2 9 26.6 10.8 26.6 13 L26.6 14.6 C26.6 15.6 25.9 16.4 24.9 16.6 L24.9 22 Z" />
      <circle cx="22.6" cy="7.6" r="2.5" />
      <path d="M21 5.6 L20.4 2.8 L22.8 4.6 Z" />
      <path d="M24.4 5.4 L25.6 3 L26.2 5.4 Z" />
    </g>
    <circle cx="23.4" cy="7.4" r="0.9" fill="#17121F" />
  </Tile>
);

const Databricks: BrandMark = ({ className }) => (
  <Tile fill="#FF3621" className={className}>
    <g fill="#ffffff">
      <path d="M16 6.4 L25 11 L16 15.6 L7 11 Z" />
      <path d="M16 12.4 L25 17 L16 21.6 L7 17 Z" />
      <path d="M16 18.4 L25 23 L16 27.6 L7 23 Z" />
    </g>
  </Tile>
);

const OpenRouter: BrandMark = ({ className }) => (
  <Tile fill="#0D1526" className={className}>
    <g stroke="#5B6BF5" strokeWidth="1.8">
      <line x1="10" y1="10" x2="16" y2="16" />
      <line x1="22" y1="10" x2="16" y2="16" />
      <line x1="16" y1="23" x2="16" y2="16" />
    </g>
    <g fill="#ffffff">
      <circle cx="10" cy="10" r="2.6" />
      <circle cx="22" cy="10" r="2.6" />
      <circle cx="16" cy="23" r="2.6" />
    </g>
    <circle cx="16" cy="16" r="3.4" fill="#7C8CFF" />
  </Tile>
);

const Snowflake: BrandMark = ({ className }) => (
  <Tile fill="#29B5E8" className={className}>
    <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
      <line x1="16" y1="5.5" x2="16" y2="26.5" />
      <line x1="7.3" y1="10.5" x2="24.7" y2="21.5" />
      <line x1="7.3" y1="21.5" x2="24.7" y2="10.5" />
      <line x1="13" y1="7.6" x2="16" y2="10.6" />
      <line x1="19" y1="7.6" x2="16" y2="10.6" />
      <line x1="13" y1="24.4" x2="16" y2="21.4" />
      <line x1="19" y1="24.4" x2="16" y2="21.4" />
      <line x1="7.8" y1="15" x2="11.4" y2="12.9" />
      <line x1="7.8" y1="17" x2="11.4" y2="19.1" />
      <line x1="24.2" y1="15" x2="20.6" y2="12.9" />
      <line x1="24.2" y1="17" x2="20.6" y2="19.1" />
    </g>
  </Tile>
);

const MiniMax: BrandMark = ({ className }) => (
  <Tile fill="#7C4DF0" className={className}>
    <path
      d="M8 24 L8 9 L16 16.5 L24 9 L24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Tile>
);

const Azure: BrandMark = ({ className }) => (
  <Tile fill="#0078D4" className={className}>
    <path
      d="M16 5.5 C17.7 12.2 20.8 15.3 27.5 17 C20.8 18.7 17.7 21.8 16 28.5 C14.3 21.8 11.2 18.7 4.5 17 C11.2 15.3 14.3 12.2 16 5.5 Z"
      fill="#ffffff"
    />
  </Tile>
);

const Aws: BrandMark = ({ className }) => (
  <Tile fill="#FFFFFF" className={className}>
    <path
      d="M7 18.5 C 11.5 24 20.5 24 25 19.5"
      fill="none"
      stroke="#FF9900"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path d="M23.4 16.6 L26.6 19.2 L23 21.2 Z" fill="#FF9900" />
    <path
      d="M9 12.5 C 9 10.5 10.5 9.4 13 9.4 C 15.6 9.4 17 10.7 17 12.7 L17 13.4 L12.4 13.4 C 12.6 14.7 13.6 15.5 15 15.5 C 16.1 15.5 17 15.2 17.7 14.6 L17 16.9 C 16.2 17.6 15 18 13.6 18 C 10.7 18 9 15.9 9 12.5 Z M12.4 11.5 L12.4 12.6 L14.8 12.6 C 14.8 11.6 14.1 11.1 13.6 11.1 C 13 11.1 12.5 11.2 12.4 11.5 Z"
      fill="#221F1F"
    />
  </Tile>
);

const HuggingFace: BrandMark = ({ className }) => (
  <Tile fill="#FFD21E" className={className}>
    <circle cx="13" cy="14" r="1.9" fill="#1B1B1B" />
    <circle cx="19" cy="14" r="1.9" fill="#1B1B1B" />
    <path
      d="M11.5 19.5 C 13.5 23 18.5 23 20.5 19.5"
      fill="none"
      stroke="#1B1B1B"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M14.6 8.6 L16 10.8 L17.4 8.6 Z" fill="#1B1B1B" />
  </Tile>
);

const Meta: BrandMark = ({ className }) => (
  <Tile fill="#FFFFFF" className={className}>
    <defs>
      <linearGradient id="meta-inf" x1="8" y1="24" x2="24" y2="8">
        <stop offset="0%" stopColor="#0668E1" />
        <stop offset="100%" stopColor="#00C6FF" />
      </linearGradient>
    </defs>
    <g fill="none" stroke="url(#meta-inf)" strokeWidth="3">
      <circle cx="12.6" cy="17.5" r="5" />
      <circle cx="19.4" cy="17.5" r="5" />
    </g>
  </Tile>
);

const DeepSeek: BrandMark = ({ className }) => (
  <Tile fill="#4D6BFE" className={className}>
    <path
      d="M7.5 17.5 C 10.5 10.5 18.5 8.5 24 11.5 L26.8 7.8 L26.2 13.6 C 27 18 23.4 23.4 17.4 24.1 C 12.4 24.7 8.6 21.5 7.5 17.5 Z"
      fill="#ffffff"
    />
    <circle cx="12.6" cy="16.4" r="1.2" fill="#4D6BFE" />
  </Tile>
);

const Qwen: BrandMark = ({ className }) => (
  <Tile fill="#FF7A1A" className={className}>
    <circle cx="15" cy="15.5" r="6.8" fill="none" stroke="#ffffff" strokeWidth="3.2" />
    <line
      x1="19.6"
      y1="20.2"
      x2="25"
      y2="25.6"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </Tile>
);

const Mistral: BrandMark = ({ className }) => (
  <Tile fill="#FFFFFF" className={className}>
    <g>
      <rect x="7" y="9" width="4.6" height="7" fill="#FFD000" />
      <rect x="7" y="16.4" width="4.6" height="7" fill="#FFAF00" />
      <rect x="12.8" y="9" width="4.6" height="4.5" fill="#FF7000" />
      <rect x="12.8" y="13.9" width="4.6" height="4.5" fill="#FFAF00" />
      <rect x="12.8" y="18.8" width="4.6" height="4.6" fill="#FFD000" />
      <rect x="18.6" y="9" width="4.6" height="7" fill="#FF7000" />
      <rect x="18.6" y="16.4" width="4.6" height="7" fill="#FF4A00" />
      <rect x="24.4" y="9" width="2.6" height="14.4" fill="#E84A27" />
    </g>
  </Tile>
);

const Cohere: BrandMark = ({ className }) => (
  <Tile fill="#2E7D62" className={className}>
    <path
      d="M22.5 11.5 A7.5 7.5 0 1 0 22.5 20.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <circle cx="23.5" cy="16" r="2.2" fill="#FFD21E" />
  </Tile>
);

const Moonshot: BrandMark = ({ className }) => (
  <Tile fill="#12141C" className={className}>
    <path d="M19.5 5.5 A10.5 10.5 0 1 0 25 19.5 A11.5 11.5 0 0 1 19.5 5.5 Z" fill="#E8ECFF" />
  </Tile>
);

const LocalChip: BrandMark = ({ className }) => (
  <Tile fill="#263238" className={className}>
    <rect
      x="10"
      y="10"
      width="12"
      height="12"
      rx="2"
      fill="none"
      stroke="#4DD0A1"
      strokeWidth="2.2"
    />
    <rect x="13.4" y="13.4" width="5.2" height="5.2" rx="1" fill="#4DD0A1" />
    <g stroke="#4DD0A1" strokeWidth="1.8" strokeLinecap="round">
      <line x1="13" y1="6.5" x2="13" y2="10" />
      <line x1="19" y1="6.5" x2="19" y2="10" />
      <line x1="13" y1="22" x2="13" y2="25.5" />
      <line x1="19" y1="22" x2="19" y2="25.5" />
      <line x1="6.5" y1="13" x2="10" y2="13" />
      <line x1="6.5" y1="19" x2="10" y2="19" />
      <line x1="22" y1="13" x2="25.5" y2="13" />
      <line x1="22" y1="19" x2="25.5" y2="19" />
    </g>
  </Tile>
);

const SauronEye: BrandMark = ({ className }) => (
  <Tile fill="#1D0805" className={className}>
    <defs>
      <radialGradient id="sauron-eye-iris" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#FFF8D8" />
        <stop offset="30%" stopColor="#FFDE5C" />
        <stop offset="65%" stopColor="#FF8A1E" />
        <stop offset="100%" stopColor="#C81D11" />
      </radialGradient>
    </defs>
    <path
      d="M4 16 C 8.6 9.4 23.4 9.4 28 16 C 23.4 22.6 8.6 22.6 4 16 Z"
      fill="url(#sauron-eye-iris)"
      stroke="#FFB347"
      strokeWidth="1"
    />
    <ellipse cx="16" cy="16" rx="1.7" ry="5" fill="#150301" />
    <path
      d="M6.6 11.8 C 9 7.4 13 6.4 16 6.4 C 19 6.4 23 7.4 25.4 11.8 C 22.6 10.2 19.6 9.4 16 9.4 C 12.4 9.4 9.4 10.2 6.6 11.8 Z"
      fill="#FF7A18"
      opacity="0.55"
    />
  </Tile>
);

/* ---------------------------------------------------------------- provider registry */

const PROVIDER_MARKS: Record<string, BrandMark> = {
  openai: OpenAI,
  anthropic: Anthropic,
  google: Google,
  vertex: Google,
  vertexai: Google,
  gcp: Google,
  gemini: Gemini,
  xai: Xai,
  groq: Groq,
  ollama: Ollama,
  databricks: Databricks,
  openrouter: OpenRouter,
  snowflake: Snowflake,
  minimax: MiniMax,
  azure: Azure,
  azure_foundry: Azure,
  foundry: Azure,
  bedrock: Aws,
  aws: Aws,
  amazon: Aws,
  huggingface: HuggingFace,
  hf: HuggingFace,
  moonshot: Moonshot,
  kimi: Moonshot,
  mistral: Mistral,
  cohere: Cohere,
  local: LocalChip,
  tanzu_ai: Azure,
};

const PROVIDER_KEY_ALIASES = Object.keys(PROVIDER_MARKS);

function resolveProviderMark(provider?: string | null): BrandMark {
  if (!provider) return SauronEye;
  const key = provider.trim().toLowerCase();
  if (PROVIDER_MARKS[key]) return PROVIDER_MARKS[key];
  for (const alias of PROVIDER_KEY_ALIASES) {
    if (key.includes(alias)) return PROVIDER_MARKS[alias];
  }
  return SauronEye;
}

/* ---------------------------------------------------------------- model registry */

const MODEL_PREFIXES: [string, BrandMark][] = [
  ['gpt', OpenAI],
  ['chatgpt', OpenAI],
  ['o1', OpenAI],
  ['o3', OpenAI],
  ['o4', OpenAI],
  ['text-embedding', OpenAI],
  ['sora', OpenAI],
  ['claude', Anthropic],
  ['anthropic', Anthropic],
  ['gemini', Gemini],
  ['gemma', Gemini],
  ['palm', Gemini],
  ['grok', Xai],
  ['llama', Meta],
  ['meta', Meta],
  ['deepseek', DeepSeek],
  ['qwen', Qwen],
  ['qwq', Qwen],
  ['tongyi', Qwen],
  ['glm', Azure],
  ['chatglm', Azure],
  ['mistral', Mistral],
  ['mixtral', Mistral],
  ['codestral', Mistral],
  ['magistral', Mistral],
  ['minimax', MiniMax],
  ['abab', MiniMax],
  ['command', Cohere],
  ['aya', Cohere],
  ['phi', Azure],
  ['mai', Azure],
  ['kimi', Moonshot],
  ['moonshot', Moonshot],
  ['ollama', Ollama],
  ['llava', Ollama],
  ['huggingface', HuggingFace],
  ['smollm', HuggingFace],
  ['snowflake', Snowflake],
  ['databricks', Databricks],
  ['openrouter', OpenRouter],
  ['bedrock', Aws],
];

function resolveModelMark(model?: string | null, provider?: string | null): BrandMark {
  const m = (model || '').trim().toLowerCase();
  if (m) {
    const head = m.includes('/') ? m.split('/')[0] : '';
    for (const [prefix, mark] of MODEL_PREFIXES) {
      if (m.startsWith(prefix) || head === prefix) return mark;
    }
    if (head && PROVIDER_MARKS[head]) return PROVIDER_MARKS[head];
  }
  return resolveProviderMark(provider);
}

/* ---------------------------------------------------------------- public API */

interface BrandIconProps {
  /** Model id/name — matched by family prefix (gpt, claude, gemini, …). */
  model?: string | null;
  /** Provider id or display name (openai, "OpenAI", aws bedrock, …). */
  provider?: string | null;
  className?: string;
}

export function BrandIcon({ model, provider, className = 'w-8 h-8' }: BrandIconProps) {
  const icon = resolveProviderIcon(provider);
  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className={`${className} flex-shrink-0 object-contain dark:brightness-0 dark:invert`}
      />
    );
  }

  const Mark = model ? resolveModelMark(model, provider) : resolveProviderMark(provider);
  if (Mark === SauronEye && isKnownProvider(provider)) {
    return <ProviderMonogram provider={provider} className={className} />;
  }
  return <Mark className={className} />;
}

export function ProviderBrandIcon({
  provider,
  className = 'w-8 h-8',
}: {
  provider?: string | null;
  className?: string;
}) {
  return <BrandIcon provider={provider} className={className} />;
}

export function ModelBrandIcon({
  model,
  provider,
  className = 'w-8 h-8',
}: {
  model?: string | null;
  provider?: string | null;
  className?: string;
}) {
  return <BrandIcon model={model} provider={provider} className={className} />;
}
