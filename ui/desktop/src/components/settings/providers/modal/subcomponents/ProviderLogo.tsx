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
  const iconClassName = size === 'sm' ? 'w-8 h-8' : 'w-16 h-16';

  return (
    <div className={`flex justify-center${size === 'md' ? ' mb-2' : ''}`}>
      <BrandIcon provider={providerName} className={iconClassName} />
      <span className="sr-only">{intl.formatMessage(i18n.logoAlt, { providerName })}</span>
    </div>
  );
}