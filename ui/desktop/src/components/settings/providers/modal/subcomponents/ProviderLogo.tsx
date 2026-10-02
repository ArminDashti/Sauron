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
}

export default function ProviderLogo({ providerName }: ProviderLogoProps) {
  const intl = useIntl();
  return (
    <div className="flex justify-center mb-2">
      <BrandIcon provider={providerName} className="w-16 h-16" />
      <span className="sr-only">
        {intl.formatMessage(i18n.logoAlt, { providerName })}
      </span>
    </div>
  );
}