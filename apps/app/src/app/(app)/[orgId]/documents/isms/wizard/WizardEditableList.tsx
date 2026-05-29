'use client';

import { Button, Input, Text } from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';

interface WizardEditableListProps {
  label: string;
  helper?: string;
  items: string[];
  emptyText: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

/**
 * Add/remove editor for a single string list (cloud-scope layers, intended
 * outcomes). The committed values live in the parent React Hook Form state; only
 * the in-progress draft text is local.
 */
export function WizardEditableList({
  label,
  helper,
  items,
  emptyText,
  onAdd,
  onRemove,
}: WizardEditableListProps) {
  const [draft, setDraft] = useState('');
  const safeItems = Array.isArray(items) ? items : [];

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAdd();
  };

  return (
    <div className="flex flex-col gap-2">
      <Text size="base" weight="semibold">
        {label}
      </Text>
      {helper && (
        <div className="text-muted-foreground">
          <Text variant="muted">{helper}</Text>
        </div>
      )}

      {safeItems.length === 0 ? (
        <div className="rounded-md border border-dashed py-4 text-center">
          <Text variant="muted">{emptyText}</Text>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {safeItems.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-sm">{item}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onRemove(index)}
                iconLeft={<TrashCan size={16} />}
                aria-label={`Remove ${label} item`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Add to ${label.toLowerCase()}`}
          aria-label={`New ${label} item`}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAdd}
          disabled={!draft.trim()}
          iconLeft={<Add size={16} />}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
