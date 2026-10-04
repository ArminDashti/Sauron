import AnthropicIcon from './icons/anthropic.svg';
import AimlapiIcon from './icons/aimlapi.svg';
import AlibabacloudIcon from './icons/alibabacloud.svg';
import AmpIcon from './icons/amp.svg';
import AtomicChatIcon from './icons/atomic_chat.svg';
import AwsBedrockIcon from './icons/aws_bedrock.svg';
import AzureFoundryIcon from './icons/azure_foundry.svg';
import CerebrasIcon from './icons/cerebras.svg';
import ClaudeIcon from './icons/claude.svg';
import CodexIcon from './icons/codex.svg';
import CohereIcon from './icons/cohere.svg';
import CursorIcon from './icons/cursor.svg';
import DatabricksIcon from './icons/databricks.svg';
import DeepseekIcon from './icons/deepseek.svg';
import FireworksIcon from './icons/fireworks.svg';
import FriendliIcon from './icons/friendli.svg';
import GeminiIcon from './icons/gemini.svg';
import GondolaIcon from './icons/gondola.svg';
import GoogleIcon from './icons/google.svg';
import GroqIcon from './icons/groq.svg';
import GithubCopilotIcon from './icons/github_copilot.svg';
import HuggingfaceIcon from './icons/huggingface.svg';
import IflytekcloudIcon from './icons/iflytekcloud.svg';
import InceptionIcon from './icons/inception.svg';
import KimiIcon from './icons/kimi.svg';
import LitellmIcon from './icons/litellm.svg';
import LlamaswapIcon from './icons/llama_swap.svg';
import LmstudioIcon from './icons/lmstudio.svg';
import MetaIcon from './icons/meta.svg';
import MicrosoftIcon from './icons/microsoft.svg';
import MinimaxIcon from './icons/minimax.svg';
import MistralIcon from './icons/mistral.svg';
import MoonshotIcon from './icons/moonshot.svg';
import NanogptIcon from './icons/nano_gpt.svg';
import NearIcon from './icons/near.svg';
import NvidiaIcon from './icons/nvidia.svg';
import NovitaIcon from './icons/novita.svg';
import OllamaIcon from './icons/ollama.svg';
import OmlxIcon from './icons/omlx.svg';
import OpencodeIcon from './icons/opencode.svg';
import OpenaiIcon from './icons/openai.svg';
import OpenrouterIcon from './icons/openrouter.svg';
import OpperIcon from './icons/opper.svg';
import OvhIcon from './icons/ovh.svg';
import PerplexityIcon from './icons/perplexity.svg';
import PiIcon from './icons/pi.svg';
import PleumrouterIcon from './icons/pleumrouter.svg';
import RoutstrIcon from './icons/routstr.svg';
import SakanaIcon from './icons/sakana.svg';
import SaladcloudIcon from './icons/saladcloud.svg';
import SauronIcon from '../../images/glyph.svg';
import SaygmIcon from './icons/saygm.svg';
import ScalewayIcon from './icons/scaleway.svg';
import SnowflakeIcon from './icons/snowflake.svg';
import TetrateIcon from './icons/tetrate.svg';
import TogetherIcon from './icons/together.svg';
import TrustedrouterIcon from './icons/trustedrouter.svg';
import VeniceIcon from './icons/venice.svg';
import VercelIcon from './icons/vercel.svg';
import VertexaiIcon from './icons/vertexai.svg';
import VMwareIcon from './icons/vmware.svg';
import XaiIcon from './icons/xai.svg';
import ZhipuIcon from './icons/zhipu.svg';

/**
 * Canonical provider id -> vendored brand mark.
 *
 * The marks are transparent-background SVGs from Simple Icons (CC0-1.0),
 * LobeHub Icons (MIT), and the vendors' own published assets, normalised to a
 * plain `viewBox="0 0 24 24"` shape so `dark:brightness-0 dark:invert` handles
 * dark mode uniformly across the set. Keys are the ids the Rust provider
 * registry reports, not model names.
 */
const PROVIDER_ICONS: Record<string, string> = {
  // major labs and clouds
  openai: OpenaiIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  gemini_oauth: GeminiIcon,
  xai: XaiIcon,
  xai_oauth: XaiIcon,
  meta: MetaIcon,
  mistral: MistralIcon,
  deepseek: DeepseekIcon,
  custom_deepseek: DeepseekIcon,
  cohere: CohereIcon,
  minimax: MinimaxIcon,
  moonshot: MoonshotIcon,
  kimi_code: KimiIcon,
  nvidia: NvidiaIcon,
  alibaba: AlibabacloudIcon,
  zhipu: ZhipuIcon,
  zai: ZhipuIcon,
  zai_coding_plan: ZhipuIcon,

  // inference gateways and routers
  openrouter: OpenrouterIcon,
  cerebras: CerebrasIcon,
  groq: GroqIcon,
  perplexity: PerplexityIcon,
  'fireworks-ai': FireworksIcon,
  friendli: FriendliIcon,
  together: TogetherIcon,
  novita: NovitaIcon,
  nearai: NearIcon,
  vercel_ai_gateway: VercelIcon,
  venice: VeniceIcon,
  sakana: SakanaIcon,
  inception: InceptionIcon,
  iflytek: IflytekcloudIcon,
  iflytek_astron: IflytekcloudIcon,

  // gateways whose marks are vendor assets rather than icon-set entries
  aimlapi: AimlapiIcon,
  atomic_chat: AtomicChatIcon,
  gondola: GondolaIcon,
  litellm: LitellmIcon,
  llama_swap: LlamaswapIcon,
  'nano-gpt': NanogptIcon,
  omlx: OmlxIcon,
  opper: OpperIcon,
  pleumrouter: PleumrouterIcon,
  routstr: RoutstrIcon,
  saladcloud: SaladcloudIcon,
  sauron: SauronIcon,
  saygm: SaygmIcon,
  tetrate: TetrateIcon,
  trustedrouter: TrustedrouterIcon,

  // clouds and platforms
  ollama: OllamaIcon,
  ollama_cloud: OllamaIcon,
  lmstudio: LmstudioIcon,
  huggingface: HuggingfaceIcon,
  aws_bedrock: AwsBedrockIcon,
  sagemaker_tgi: AwsBedrockIcon,
  azure_foundry: AzureFoundryIcon,
  azure_openai: AzureFoundryIcon,
  gcp_vertex_ai: VertexaiIcon,
  databricks: DatabricksIcon,
  databricks_v2: DatabricksIcon,
  snowflake: SnowflakeIcon,
  ovhcloud: OvhIcon,
  scaleway: ScalewayIcon,
  tanzu_ai: VMwareIcon,

  // coding agents and harnesses
  claude: ClaudeIcon,
  'claude-acp': ClaudeIcon,
  codex: OpenaiIcon,
  'codex-acp': OpenaiIcon,
  chatgpt_codex: CodexIcon,
  cursor: CursorIcon,
  'cursor-agent': CursorIcon,
  amp: AmpIcon,
  'amp-acp': AmpIcon,
  pi: PiIcon,
  'pi-acp': PiIcon,
  opencode: OpencodeIcon,
  opencode_go: OpencodeIcon,
  opencode_zen: OpencodeIcon,
  github_copilot: GithubCopilotIcon,
  'copilot-acp': GithubCopilotIcon,
  muse_code: MetaIcon,
  microsoft: MicrosoftIcon,
};

// Ids that must resolve onto a different provider's mark.
const PROVIDER_ICON_ALIASES: Record<string, string> = {
  bedrock: 'aws_bedrock',
  github: 'github_copilot',
  copilot: 'github_copilot',
  github_copilot_cli: 'github_copilot',
  vertexai: 'gcp_vertex_ai',
  gcp: 'gcp_vertex_ai',
  azure: 'azure_foundry',
  gemini: 'gemini_oauth',
  hf: 'huggingface',
  kimi: 'kimi_code',
  qwen: 'alibaba',
  databricks_ai_gateway: 'databricks_v2',
  cursor_agent: 'cursor-agent',
  'opencode-acp': 'opencode',
};

/**
 * Display names for providers that publish no usable brand mark. These drive the
 * monogram fallback, so they must stay short and recognisable at 16px.
 */
const PROVIDER_LABELS: Record<string, string> = {
  avian: 'Avian',
  celeris: 'Celeris',
  empiriolabs: 'EmpirioLabs',
  eurouter: 'EUrouter',
  futurmix: 'FuturMix',
  local: 'Local Inference',
  lynkr: 'Lynkr',
  orcarouter: 'OrcaRouter',
};

const normalize = (provider?: string | null): string => provider?.trim().toLowerCase() ?? '';

/** Vendored mark for a provider id, or undefined when none is published. */
export function resolveProviderIcon(provider?: string | null): string | undefined {
  const normalized = normalize(provider);
  if (!normalized) return undefined;
  return PROVIDER_ICONS[PROVIDER_ICON_ALIASES[normalized] ?? normalized];
}

/** True when the id names a provider we know about, logo or not. */
export function isKnownProvider(provider?: string | null): boolean {
  const normalized = normalize(provider);
  if (!normalized) return false;
  const key = PROVIDER_ICON_ALIASES[normalized] ?? normalized;
  return key in PROVIDER_ICONS || key in PROVIDER_LABELS;
}

/** Short display name for a provider, falling back to the id itself. */
export function resolveProviderLabel(provider?: string | null): string {
  const normalized = normalize(provider);
  if (!normalized) return '';
  const key = PROVIDER_ICON_ALIASES[normalized] ?? normalized;
  return PROVIDER_LABELS[key] ?? normalized;
}

/**
 * Two-letter monogram for a provider: the first letter of each of the first two
 * words in the display name. Camel case is treated as a word boundary so
 * brand-like names keep two letters ("NanoGPT" -> "NG", "SayGM" -> "SG").
 */
export function providerMonogram(provider?: string | null): string {
  const words = resolveProviderLabel(provider)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  if (!words.length) return '??';
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * Stable hue per provider so the same gateway always gets the same monogram
 * colour across sessions.
 */
export function providerAccent(provider?: string | null): string {
  const label = resolveProviderLabel(provider);
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 360;
  }
  return `hsl(${hash} 62% 45%)`;
}
