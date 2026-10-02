import { BrandIcon } from '../../../../logos/BrandLogos';
import { defineMessages, useIntl } from '../../../../../i18n';

const i18n = defineMessages({
  logoAlt: {
    id: 'providerLogo.alt',
    defaultMessage: '{providerName} logo',
  },
});

interface ProviderLogoProps {
  providerName: string;
  /** 'md' matches the modal styling; 'sm' renders a compact inline avatar. */
  size?: 'sm' | 'md';
}

export default function ProviderLogo({ providerName, size = 'md' }: ProviderLogoProps) {
  const intl = useIntl();
  // Convert provider name to lowercase and fetch the logo
  const logoKey = providerName.toLowerCase();
  const logo = providerLogos[logoKey] || DefaultLogo;

  // Special handling for xAI logo
  const isXai = logoKey === 'xai';
  const imageStyle = isXai ? { filter: 'invert(1)', opacity: 0.9 } : {};

  // Use smaller size for xAI logo to fit better in circle
  const imageClassName = isXai
    ? size === 'sm'
      ? 'w-5 h-5 object-contain' // Compact xAI logo
      : 'w-8 h-8 object-contain' // Smaller size for xAI
    : size === 'sm'
      ? 'w-10 h-10 object-contain' // Compact default logo
      : 'w-16 h-16 object-contain'; // Default size for others

  const circleClassName = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';

  return (
    <div className={`flex justify-center${size === 'md' ? ' mb-2' : ''}`}>
      <div
        className={`${circleClassName} bg-black rounded-full overflow-hidden flex items-center justify-center`}
      >
        <img
          src={logo}
          alt={intl.formatMessage(i18n.logoAlt, { providerName })}
          className={imageClassName}
          style={imageStyle}
        />
      </div>
    </div>
  );
}