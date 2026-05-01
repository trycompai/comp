'use client';

import { cn } from '@/lib/utils';
import { RiskTreatmentType } from '@db';
import {
  ArrowsHorizontal,
  Checkmark,
  CheckmarkOutline,
  CloseOutline,
  Security,
} from '@trycompai/design-system/icons';
import type { CarbonIconType } from '@carbon/icons-react';

interface StrategyOption {
  value: RiskTreatmentType;
  label: string;
  blurb: string;
  Icon: CarbonIconType;
}

const OPTIONS: StrategyOption[] = [
  {
    value: RiskTreatmentType.accept,
    label: 'Accept',
    blurb: 'Live with the risk; document the rationale. Residual equals inherent.',
    Icon: CheckmarkOutline,
  },
  {
    value: RiskTreatmentType.avoid,
    label: 'Avoid',
    blurb: 'Eliminate the activity that causes the risk. Residual pins to the minimum.',
    Icon: CloseOutline,
  },
  {
    value: RiskTreatmentType.mitigate,
    label: 'Mitigate',
    blurb: 'Apply controls to reduce likelihood and impact.',
    Icon: Security,
  },
  {
    value: RiskTreatmentType.transfer,
    label: 'Transfer',
    blurb: 'Shift the impact (e.g. cyber insurance, contractual indemnity).',
    Icon: ArrowsHorizontal,
  },
];

interface StrategyPickerProps {
  value: RiskTreatmentType;
  onChange: (next: RiskTreatmentType) => void;
  disabled?: boolean;
}

export function StrategyPicker({ value, onChange, disabled }: StrategyPickerProps) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Treatment strategy">
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={opt.label}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-start gap-3 rounded-md border p-3 text-left transition-all duration-200',
              'disabled:cursor-not-allowed disabled:opacity-60',
              isActive
                ? 'border-primary bg-primary/[0.04] ring-1 ring-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            <Icon
              size={18}
              className={cn(
                'mt-0.5 shrink-0',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
            <div className="flex-1">
              <div className="text-sm font-normal">{opt.label}</div>
              <div className="mt-0.5 text-xs leading-[1.4] text-muted-foreground">{opt.blurb}</div>
            </div>
            {isActive && (
              <Checkmark size={14} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
