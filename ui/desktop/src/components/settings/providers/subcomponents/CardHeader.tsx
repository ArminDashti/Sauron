import { memo } from 'react';
import { GreenCheckButton } from './buttons/CardButtons';
import { ConfiguredProviderTooltipMessage, ProviderDescription } from './utils/StringUtils';
import { useIntl } from '../../../../i18n';
import { BrandIcon } from '../../../logos/BrandLogos';

interface CardHeaderProps {
  name: string;
  description: string;
  isConfigured: boolean;
  providerId?: string;
}

// Make CardTitle a proper React component
const CardTitle = memo(({ name }: { name: string }) => {
  return <h3 className="text-base font-medium text-text-primary truncate mr-2">{name}</h3>;
});
CardTitle.displayName = 'CardTitle';

// Properly type ProviderNameAndStatus props
interface ProviderNameAndStatusProps {
  name: string;
  isConfigured: boolean;
  providerId?: string;
}

const ProviderNameAndStatus = memo(({ name, isConfigured, providerId }: ProviderNameAndStatusProps) => {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 min-w-0">
        {providerId && <BrandIcon provider={providerId} className="w-6 h-6 shrink-0" />}
        <CardTitle name={name} />
      </div>

      {/* Configured state: Green check */}
      {isConfigured && <GreenCheckButton tooltip={ConfiguredProviderTooltipMessage(intl, name)} />}
    </div>
  );
});
ProviderNameAndStatus.displayName = 'ProviderNameAndStatus';

// Add a container div to the CardHeader
const CardHeader = memo(function CardHeader({ name, description, isConfigured, providerId }: CardHeaderProps) {
  return (
    <>
      <ProviderNameAndStatus name={name} isConfigured={isConfigured} providerId={providerId} />
      <ProviderDescription description={description} />
    </>
  );
});
CardHeader.displayName = 'CardHeader';

export default CardHeader;
