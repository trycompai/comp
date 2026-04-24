'use client';

import { RiskTreatmentType } from '@db';
import { RadioGroup, RadioGroupItem, Stack, Text } from '@trycompai/design-system';

const OPTIONS: { value: RiskTreatmentType; label: string; blurb: string }[] = [
  {
    value: RiskTreatmentType.accept,
    label: 'Accept',
    blurb: 'Live with the risk; document the rationale. Residual equals inherent.',
  },
  {
    value: RiskTreatmentType.avoid,
    label: 'Avoid',
    blurb: 'Eliminate the activity that causes the risk. Residual pins to the minimum.',
  },
  {
    value: RiskTreatmentType.mitigate,
    label: 'Mitigate',
    blurb: 'Apply controls to reduce likelihood and impact.',
  },
  {
    value: RiskTreatmentType.transfer,
    label: 'Transfer',
    blurb: 'Shift the impact (e.g. cyber insurance, contractual indemnity).',
  },
];

const STRATEGY_VALUES = new Set<RiskTreatmentType>(Object.values(RiskTreatmentType));

function isRiskTreatmentType(value: unknown): value is RiskTreatmentType {
  return typeof value === 'string' && STRATEGY_VALUES.has(value as RiskTreatmentType);
}

interface StrategyPickerProps {
  value: RiskTreatmentType;
  onChange: (next: RiskTreatmentType) => void;
  disabled?: boolean;
}

export function StrategyPicker({ value, onChange, disabled }: StrategyPickerProps) {
  const handleValueChange = (next: unknown) => {
    if (isRiskTreatmentType(next)) {
      onChange(next);
    }
  };

  return (
    <RadioGroup value={value} onValueChange={handleValueChange} disabled={disabled}>
      {OPTIONS.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-start gap-3 py-2">
          <RadioGroupItem value={opt.value} aria-label={opt.label} />
          <Stack gap="none">
            <Text size="sm" weight="medium">
              {opt.label}
            </Text>
            <Text size="xs" variant="muted">
              {opt.blurb}
            </Text>
          </Stack>
        </label>
      ))}
    </RadioGroup>
  );
}
