'use client';

import { Button, HStack, Heading, Stack } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useState, type ReactNode } from 'react';

export interface IsmsAddCardProps {
  /** Label for the closed-state trigger button, e.g. "Add interested party". */
  addLabel: string;
  /** Heading shown above the form when the card is open. */
  formTitle: string;
  /**
   * The add form. Receives `close` so it can collapse the card after a
   * successful submit (or when the user cancels).
   */
  children: (helpers: { close: () => void }) => ReactNode;
}

/**
 * The shared "add entry" affordance for every ISMS register. Collapsed, it is a
 * single secondary button; expanded, it reveals the form inside a subtle muted
 * card with its own heading and a Cancel control — so adding feels intentional
 * rather than a raw form footer pinned under a table.
 */
export function IsmsAddCard({ addLabel, formTitle, children }: IsmsAddCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="flex">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsOpen(true)}
          iconLeft={<Add size={16} />}
        >
          {addLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4">
      <HStack align="center" justify="between" gap="3">
        <Heading level="4">{formTitle}</Heading>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </HStack>
      <Stack gap="3">{children({ close: () => setIsOpen(false) })}</Stack>
    </div>
  );
}
