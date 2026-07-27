'use client';

import { Button, Input, Label, Stack, Text } from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { useRef } from 'react';

export interface WizardObjective {
  objective: string;
  target: string;
}

interface WizardObjectivesEditorProps {
  items: WizardObjective[];
  onChange: (next: WizardObjective[]) => void;
}

const newRowId = () => `obj-${crypto.randomUUID()}`;

/**
 * Q11: confirm/override the ~6 default information security objectives and their
 * targets in place. Each row is an editable objective + target pair; rows can be
 * added or removed. The committed list lives in the parent React Hook Form state.
 *
 * The objective data shape has no id, so we keep a parallel list of stable row
 * ids (in a ref) aligned to `items` by position. Keying on these instead of the
 * array index keeps focus/cursor on the right input when a row is removed.
 */
export function WizardObjectivesEditor({ items, onChange }: WizardObjectivesEditorProps) {
  const rows = Array.isArray(items) ? items : [];

  // Keep one stable id per row, aligned by index, so React reconciles by
  // identity rather than position. Grow/shrink to match the current row count
  // (handles defaults arriving after mount and external resets).
  const idsRef = useRef<string[]>([]);
  while (idsRef.current.length < rows.length) idsRef.current.push(newRowId());
  if (idsRef.current.length > rows.length) {
    idsRef.current = idsRef.current.slice(0, rows.length);
  }
  const ids = idsRef.current;

  const handleField = ({
    index,
    field,
    text,
  }: {
    index: number;
    field: keyof WizardObjective;
    text: string;
  }) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: text } : row)));
  };

  const handleRemove = (index: number) => {
    idsRef.current = ids.filter((_, i) => i !== index);
    onChange(rows.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    idsRef.current = [...ids, newRowId()];
    onChange([...rows, { objective: '', target: '' }]);
  };

  return (
    <Stack gap="3">
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-4 text-center">
          <Text size="sm" variant="muted">
            No objectives yet. Add at least one.
          </Text>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li
              key={ids[index]}
              className="flex flex-col gap-2 rounded-md border border-border bg-card p-3"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor={`objective-${ids[index]}`}>Objective</Label>
                <Input
                  id={`objective-${ids[index]}`}
                  value={row.objective}
                  onChange={(event) =>
                    handleField({ index, field: 'objective', text: event.target.value })
                  }
                  placeholder="e.g. Maintain availability of customer-facing services"
                  aria-label={`Objective ${index + 1}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`target-${ids[index]}`}>Target</Label>
                <Input
                  id={`target-${ids[index]}`}
                  value={row.target}
                  onChange={(event) =>
                    handleField({ index, field: 'target', text: event.target.value })
                  }
                  placeholder="e.g. 99.9% uptime measured monthly"
                  aria-label={`Target ${index + 1}`}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(index)}
                  iconLeft={<TrashCan size={16} />}
                  aria-label={`Remove objective ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAdd}
          iconLeft={<Add size={16} />}
        >
          Add objective
        </Button>
      </div>
    </Stack>
  );
}
