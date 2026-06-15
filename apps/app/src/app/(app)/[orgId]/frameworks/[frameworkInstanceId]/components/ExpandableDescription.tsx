'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { Maximize } from '@trycompai/design-system/icons';
import { useState } from 'react';

interface ExpandableDescriptionProps {
  description: string | null | undefined;
  identifier?: string | null;
  name?: string | null;
}

/**
 * Read-only requirement description cell. Shows the truncated text inline and,
 * on hover, a maximize button that opens a dialog with the full description —
 * long framework requirements (e.g. NIST SP800-53 PL-2) are otherwise
 * unreadable behind the single-line truncation + native tooltip.
 */
export function ExpandableDescription({
  description,
  identifier,
  name,
}: ExpandableDescriptionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!description) {
    return <span className="block truncate text-sm">—</span>;
  }

  const heading = [identifier?.trim(), name].filter(Boolean).join(' · ') || 'Requirement';

  return (
    <div className="group relative flex items-center">
      <span className="block truncate pr-6 text-sm" title={description}>
        {description}
      </span>
      <button
        type="button"
        aria-label="Read full description"
        title="Read full description"
        className="text-muted-foreground hover:text-foreground absolute right-0 top-1/2 -translate-y-1/2 rounded-xs p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={(e) => {
          // The row is a navigation target — don't follow it when expanding.
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(true);
        }}
      >
        <Maximize size={14} />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent size="3xl">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
