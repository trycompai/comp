'use client';

import { Badge, Button, Checkbox, Input, Text } from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import {
  CUSTOM_REGULATOR_PREFIX,
  SECTOR_REGULATOR_LABELS,
} from './wizard-types';

interface WizardRegulatorSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

function isCustom(entry: string): boolean {
  return entry.startsWith(CUSTOM_REGULATOR_PREFIX);
}

function customLabel(entry: string): string {
  return entry.slice(CUSTOM_REGULATOR_PREFIX.length);
}

function regulatorLabel(entry: string): string {
  if (isCustom(entry)) return customLabel(entry);
  return SECTOR_REGULATOR_LABELS[entry] ?? entry;
}

/**
 * Q5: sector regulators reached via contract flow-down. Suggested options render
 * as a checkbox list; customers may add free-text regulators (stored with the
 * `custom:` prefix the API expects). Committed values live in the parent form.
 */
export function WizardRegulatorSelect({ options, value, onChange }: WizardRegulatorSelectProps) {
  const [draft, setDraft] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const customSelections = selected.filter(isCustom);

  const handleToggle = ({ option, checked }: { option: string; checked: boolean }) => {
    if (checked) {
      if (selected.includes(option)) return;
      onChange([...selected, option]);
      return;
    }
    onChange(selected.filter((entry) => entry !== option));
  };

  const handleAddCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const entry = `${CUSTOM_REGULATOR_PREFIX}${trimmed}`;
    if (selected.includes(entry)) {
      setDraft('');
      return;
    }
    onChange([...selected, entry]);
    setDraft('');
  };

  const handleRemoveCustom = (entry: string) => {
    onChange(selected.filter((item) => item !== entry));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAddCustom();
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          const id = `regulator-${option}`;
          return (
            <li key={option} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(next) => handleToggle({ option, checked: next })}
                aria-label={regulatorLabel(option)}
              />
              <label htmlFor={id} className="text-sm">
                {regulatorLabel(option)}
              </label>
            </li>
          );
        })}
      </ul>

      {customSelections.length > 0 && (
        <ul className="flex flex-col gap-2">
          {customSelections.map((entry) => (
            <li
              key={entry}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Custom</Badge>
                <span className="text-sm">{customLabel(entry)}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveCustom(entry)}
                iconLeft={<TrashCan size={16} />}
                aria-label={`Remove ${customLabel(entry)}`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-muted-foreground">
          <Text variant="muted">Add another regulator not listed above.</Text>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. State data protection authority"
            aria-label="Custom regulator"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAddCustom}
            disabled={!draft.trim()}
            iconLeft={<Add size={16} />}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
