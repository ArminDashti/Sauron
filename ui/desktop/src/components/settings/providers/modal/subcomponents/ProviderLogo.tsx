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
  const className = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';

  return (
    <div
      className={`flex justify-center${size === 'md' ? ' mb-2' : ''}`}
      role="img"
      aria-label={intl.formatMessage(i18n.logoAlt, { providerName })}
    >
      <BrandIcon provider={providerName} className={className} />
    </div>
  );
}
