'use client';

import { TaskFrequency } from '@db';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';

const LABELS: Record<TaskFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const FREQUENCIES = Object.keys(LABELS) as TaskFrequency[];

export function SchedulePicker({
  value,
  onChange,
  disabled,
}: {
  value: TaskFrequency;
  onChange: (value: TaskFrequency) => void;
  disabled?: boolean;
}) {
  const handleValueChange = (next: TaskFrequency | null) => {
    if (next !== null) {
      onChange(next);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select a frequency" />
      </SelectTrigger>
      <SelectContent>
        {FREQUENCIES.map((freq) => (
          <SelectItem key={freq} value={freq}>
            {LABELS[freq]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
