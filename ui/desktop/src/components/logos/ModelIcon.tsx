import { Bot } from 'lucide-react';
import OpenAIIcon from './icons/openai.svg';
import AnthropicIcon from './icons/anthropic.svg';
import GoogleIcon from './icons/google.svg';
import GroqIcon from './icons/groq.svg';
import OllamaIcon from './icons/ollama.svg';
import DatabricksIcon from './icons/databricks.svg';
import OpenRouterIcon from './icons/openrouter.svg';
import SnowflakeIcon from './icons/snowflake.svg';
import XaiIcon from './icons/xai.svg';
import MinimaxIcon from './icons/minimax.svg';
import AzureFoundryIcon from './icons/azure_foundry.svg';
import DeepseekIcon from './icons/deepseek.svg';
import MistralIcon from './icons/mistral.svg';
import MicrosoftIcon from './icons/microsoft.svg';
import AwsBedrockIcon from './icons/aws_bedrock.svg';
import GithubCopilotIcon from './icons/github_copilot.svg';
import PerplexityIcon from './icons/perplexity.svg';
import HuggingfaceIcon from './icons/huggingface.svg';
import CohereIcon from './icons/cohere.svg';
import CerebrasIcon from './icons/cerebras.svg';
import LmstudioIcon from './icons/lmstudio.svg';

// Transparent-background brand marks for model providers, downloaded from
// Simple Icons (CC0) and LobeHub Icons (MIT). The icons are monochrome; dark
// mode whitens them via the `dark:brightness-0 dark:invert` classes below so
// they stay visible on any surface.
const modelIcons: Record<string, string> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  groq: GroqIcon,
  ollama: OllamaIcon,
  databricks: DatabricksIcon,
  openrouter: OpenRouterIcon,
  snowflake: SnowflakeIcon,
  xai: XaiIcon,
  minimax: MinimaxIcon,
  azure_foundry: AzureFoundryIcon,
  deepseek: DeepseekIcon,
  mistral: MistralIcon,
  microsoft: MicrosoftIcon,
  aws_bedrock: AwsBedrockIcon,
  github_copilot: GithubCopilotIcon,
  perplexity: PerplexityIcon,
  huggingface: HuggingfaceIcon,
  cohere: CohereIcon,
  cerebras: CerebrasIcon,
  lmstudio: LmstudioIcon,
};

// Provider ids the rest of the app uses that map onto a different icon key.
const providerAliases: Record<string, string> = {
  custom_deepseek: 'deepseek',
  bedrock: 'aws_bedrock',
  github: 'github_copilot',
  copilot: 'github_copilot',
  gemini: 'google',
  vertexai: 'google',
  azure: 'azure_foundry',
  azure_openai: 'azure_foundry',
};

interface ModelIconProps {
  /** Provider id (e.g. `openai`, `anthropic`), model id, or null. */
  provider?: string | null;
  /** Tailwind classes for sizing/spacing; defaults to `h-4 w-4`. */
  className?: string;
}

/**
 * Renders the brand mark for a model's provider. Icons are decorative — the
 * model or provider name is rendered alongside them — so unknown providers
 * fall back to the generic Bot glyph instead of a broken image.
 */
export default function ModelIcon({ provider, className = 'h-4 w-4' }: ModelIconProps) {
  const normalized = provider?.trim().toLowerCase() ?? '';
  const key = providerAliases[normalized] ?? normalized;
  const icon = modelIcons[key];

  if (!icon) {
    return <Bot className={`${className} flex-shrink-0 text-text-secondary`} aria-hidden="true" />;
  }

  return (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      className={`${className} flex-shrink-0 object-contain dark:brightness-0 dark:invert`}
    />
  );
}
