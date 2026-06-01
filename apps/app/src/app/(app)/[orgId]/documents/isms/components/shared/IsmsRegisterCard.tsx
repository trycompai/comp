import { HStack, Stack, Text } from '@trycompai/design-system';
import type { ReactNode } from 'react';

export interface IsmsFieldLabelProps {
  /** Muted label for the control beneath it. */
  label: string;
  /** The labelled content — a form control in edit mode, a value in read mode. */
  children: ReactNode;
}

/**
 * A labelled wrapper used by both register modes: a small muted label above its
 * content. Edit forms pass a control (Input / Textarea / Select); read views
 * pass a value via IsmsRegisterField. Defined once so the label style is
 * identical everywhere.
 */
export function IsmsFieldLabel({ label, children }: IsmsFieldLabelProps) {
  return (
    <Stack gap="1">
      <Text size="xs" variant="muted" weight="medium">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export interface IsmsRegisterFieldProps {
  /** Muted label for the secondary field. */
  label: string;
  /** The value to display. */
  children: ReactNode;
}

/**
 * A single labelled secondary field inside a register card's read view. Renders
 * the value at body text size beneath the shared muted label.
 */
export function IsmsRegisterField({ label, children }: IsmsRegisterFieldProps) {
  return (
    <IsmsFieldLabel label={label}>
      <Text size="sm">{children}</Text>
    </IsmsFieldLabel>
  );
}

export interface IsmsRegisterCardProps {
  /** Left side of the header — typically the IsmsSourceBadge. */
  header: ReactNode;
  /** Right side of the header — status/category badges and the edit/actions slot. */
  headerEnd?: ReactNode;
  /** Card body — the read display or the edit form. */
  children: ReactNode;
}

/**
 * The read-first surface for a single ISMS register entry. Echoes the
 * `IsmsDocumentCard` surface (bordered card, subtle hover) so registers feel
 * like the rest of the ISMS area instead of a spreadsheet row. The card is a
 * pure presentational shell: provenance and badges live in the header, the row
 * owns its body (read display or inline edit form).
 */
export function IsmsRegisterCard({ header, headerEnd, children }: IsmsRegisterCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/20">
      <HStack align="start" justify="between" gap="3" wrap="wrap">
        {header}
        {headerEnd && <div className="flex shrink-0 items-center gap-2">{headerEnd}</div>}
      </HStack>
      {children}
    </div>
  );
}
