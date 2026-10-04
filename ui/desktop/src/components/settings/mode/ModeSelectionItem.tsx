import { useEffect, useState, forwardRef } from 'react';
import { Gear } from '../../icons';
import { ConfigureApproveMode } from './ConfigureApproveMode';
import PermissionRulesModal from '../permission/PermissionRulesModal';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  askLabel: {
    id: 'modeSelectionItem.askLabel',
    defaultMessage: 'Ask',
  },
  askDescription: {
    id: 'modeSelectionItem.askDescription',
    defaultMessage: 'Ask questions and get answers without tools or file modifications.',
  },
  codeLabel: {
    id: 'modeSelectionItem.codeLabel',
    defaultMessage: 'Code',
  },
  codeDescription: {
    id: 'modeSelectionItem.codeDescription',
    defaultMessage: 'Edit, create and delete files freely to complete the task.',
  },
  planLabel: {
    id: 'modeSelectionItem.planLabel',
    defaultMessage: 'Plan',
  },
  planDescription: {
    id: 'modeSelectionItem.planDescription',
    defaultMessage: 'Investigate and propose a plan; every tool call needs your approval.',
  },
});

export interface SauronMode {
  key: string;
  labelDescriptor: { id: string; defaultMessage: string };
  descriptionDescriptor: { id: string; defaultMessage: string };
}

export const all_sauron_modes: SauronMode[] = [
  {
    key: 'chat',
    labelDescriptor: i18n.askLabel,
    descriptionDescriptor: i18n.askDescription,
  },
  {
    key: 'auto',
    labelDescriptor: i18n.codeLabel,
    descriptionDescriptor: i18n.codeDescription,
  },
  {
    key: 'approve',
    labelDescriptor: i18n.planLabel,
    descriptionDescriptor: i18n.planDescription,
  },
];

interface ModeSelectionItemProps {
  currentMode: string;
  mode: SauronMode;
  showDescription: boolean;
  isApproveModeConfigure: boolean;
  handleModeChange: (newMode: string) => void;
}

export const ModeSelectionItem = forwardRef<HTMLDivElement, ModeSelectionItemProps>(
  ({ currentMode, mode, showDescription, isApproveModeConfigure, handleModeChange }, ref) => {
    const intl = useIntl();
    const [checked, setChecked] = useState(currentMode == mode.key);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

    useEffect(() => {
      setChecked(currentMode === mode.key);
    }, [currentMode, mode.key]);

    return (
      <div ref={ref} className="group hover:cursor-pointer text-sm">
        <div
          className={`flex items-center justify-between text-text-primary py-2 px-2 ${checked ? 'bg-background-secondary' : 'bg-background-primary hover:bg-background-secondary'} rounded-lg transition-all`}
          onClick={() => handleModeChange(mode.key)}
        >
          <div className="flex">
            <div>
              <h3 className="text-text-primary">{intl.formatMessage(mode.labelDescriptor)}</h3>
              {showDescription && (
                <p className="text-text-secondary mt-[2px]">
                  {intl.formatMessage(mode.descriptionDescriptor)}
                </p>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            {!isApproveModeConfigure && (mode.key == 'approve' || mode.key == 'smart_approve') && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the mode change
                  setIsPermissionModalOpen(true);
                }}
              >
                <Gear className="w-4 h-4 text-text-secondary hover:text-text-primary" />
              </button>
            )}
            <input
              type="radio"
              name="modes"
              value={mode.key}
              checked={checked}
              onChange={() => handleModeChange(mode.key)}
              className="peer sr-only"
            />
            <div
              className="h-4 w-4 rounded-full border border-border-primary 
                    peer-checked:border-[6px] peer-checked:border-black dark:peer-checked:border-white
                    peer-checked:bg-white dark:peer-checked:bg-black
                    transition-all duration-200 ease-in-out group-hover:border-border-primary"
            ></div>
          </div>
        </div>
        <div>
          <div>
            {isDialogOpen ? (
              <ConfigureApproveMode
                onClose={() => {
                  setIsDialogOpen(false);
                }}
                handleModeChange={handleModeChange}
                currentMode={currentMode}
              />
            ) : null}
          </div>
        </div>

        <PermissionRulesModal
          isOpen={isPermissionModalOpen}
          onClose={() => setIsPermissionModalOpen(false)}
        />
      </div>
    );
  }
);

ModeSelectionItem.displayName = 'ModeSelectionItem';
