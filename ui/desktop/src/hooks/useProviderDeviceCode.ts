import { useEffect, useState } from 'react';
import type { ProviderDeviceCodeNotification_unstable } from '@aaif/sauron-acp-client';

export function useProviderDeviceCode(providerId: string) {
  const [deviceCode, setDeviceCode] = useState<ProviderDeviceCodeNotification_unstable | null>(
    null
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ProviderDeviceCodeNotification_unstable>).detail;
      if (detail.providerId === providerId) {
        setDeviceCode(detail);
      }
    };
    window.addEventListener('sauron:device-code', handler);
    return () => window.removeEventListener('sauron:device-code', handler);
  }, [providerId]);

  return {
    deviceCode: deviceCode?.providerId === providerId ? deviceCode : null,
    clearDeviceCode: () => setDeviceCode(null),
  };
}
