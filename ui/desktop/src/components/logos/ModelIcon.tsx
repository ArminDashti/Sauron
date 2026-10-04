import { Bot } from 'lucide-react';
import ProviderMonogram from './ProviderMonogram';
import { isKnownProvider, resolveProviderIcon } from './providerIcons';
import { resolveModelIcon } from './modelIcons';

interface ModelIconProps {
  /** Provider id (e.g. `openai`, `anthropic`), model id, or null. */
  provider?: string | null;
  /** Model id; rendered with its own vendor/family mark when recognised. */
  model?: string | null;
  /** Tailwind classes for sizing/spacing; defaults to `h-4 w-4`. */
  className?: string;
}

/**
 * Renders the brand mark for a model: the model's own vendor/family mark when
 * the id names one, otherwise its provider's mark. Icons are decorative — the
 * model or provider name is rendered alongside them — so the fallbacks degrade
 * in three steps: initials for known providers without a published mark, then
 * the generic Bot glyph for ids we do not recognise at all.
 */
export default function ModelIcon({ provider, model, className = 'h-4 w-4' }: ModelIconProps) {
  const icon = resolveModelIcon(model) ?? resolveProviderIcon(provider);

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

  if (isKnownProvider(provider)) {
    return <ProviderMonogram provider={provider} className={className} />;
  }

  return <Bot className={`${className} flex-shrink-0 text-text-secondary`} aria-hidden="true" />;
}
