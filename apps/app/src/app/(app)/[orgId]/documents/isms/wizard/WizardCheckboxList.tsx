'use client';

import { Checkbox, Text } from '@trycompai/design-system';

interface WizardCheckboxListProps {
  /** The full set of options to tick (e.g. all detected capabilities). */
  options: string[];
  /** The currently-checked subset. */
  value: string[];
  onChange: (next: string[]) => void;
  emptyText: string;
}

/**
 * Tick-list used by Q7 (capabilities in production). The customer unchecks any
 * option that is not genuinely live. The checked subset lives in the parent form.
 */
export function WizardCheckboxList({
  options,
  value,
  onChange,
  emptyText,
}: WizardCheckboxListProps) {
  const checked = Array.isArray(value) ? value : [];
  const safeOptions = Array.isArray(options) ? options : [];

  const handleToggle = ({ option, isChecked }: { option: string; isChecked: boolean }) => {
    if (isChecked) {
      if (checked.includes(option)) return;
      onChange([...checked, option]);
      return;
    }
    onChange(checked.filter((entry) => entry !== option));
  };

  if (safeOptions.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-4 text-center">
        <Text variant="muted">{emptyText}</Text>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {safeOptions.map((option) => {
        const id = `capability-${option}`;
        return (
          <li key={option} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={checked.includes(option)}
              onCheckedChange={(next) => handleToggle({ option, isChecked: next })}
              aria-label={option}
            />
            <label htmlFor={id} className="text-sm">
              {option}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
