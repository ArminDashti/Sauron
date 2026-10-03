import { providerAccent, providerMonogram } from './providerIcons';

interface ProviderMonogramProps {
  /** Provider id (e.g. `routstr`). */
  provider?: string | null;
  /** Tailwind classes for sizing/spacing; defaults to `h-4 w-4`. */
  className?: string;
}

/**
 * Fallback mark for providers that publish no brand logo. Renders the provider's
 * initials on a hue derived from its id, so the same gateway is always
 * recognisable without pretending to be an official logo.
 *
 * Uses the same 32x32 rounded tile as the hand-drawn marks so monograms line up
 * with real brand marks in grids, lists, and dropdowns.
 */
export default function ProviderMonogram({
  provider,
  className = 'h-4 w-4',
}: ProviderMonogramProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} flex-shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7"
        fill={providerAccent(provider)}
        stroke="rgba(0,0,0,0.08)"
      />
      <text
        x="16"
        y="16.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12.5"
        fontWeight="600"
        fill="#ffffff"
      >
        {providerMonogram(provider)}
      </text>
    </svg>
  );
}
