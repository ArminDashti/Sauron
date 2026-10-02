import { useEffect, useState } from 'react';
import { all_sauron_modes, ModeSelectionItem } from './ModeSelectionItem';
import { useConfig } from '../../ConfigContext';

export const ModeSection = () => {
  const [currentMode, setCurrentMode] = useState('auto');
  const { config, upsert } = useConfig();

  const handleModeChange = async (newMode: string) => {
    try {
      await upsert('SAURON_MODE', newMode, false);
      setCurrentMode(newMode);
    } catch (error) {
      console.error('Error updating sauron mode:', error);
      throw new Error(`Failed to store new sauron mode: ${newMode}`, { cause: error });
    }
  };

  useEffect(() => {
    const mode = config.SAURON_MODE as string | undefined;
    if (mode) {
      setCurrentMode(mode);
    }
  }, [config.SAURON_MODE]);

  return (
    <div className="space-y-1">
      {all_sauron_modes.map((mode) => (
        <ModeSelectionItem
          key={mode.key}
          mode={mode}
          currentMode={currentMode}
          showDescription={true}
          isApproveModeConfigure={false}
          handleModeChange={handleModeChange}
        />
      ))}
    </div>
  );
};
