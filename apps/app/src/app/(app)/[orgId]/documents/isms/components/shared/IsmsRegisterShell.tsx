import { Badge, HStack, Heading, Stack, Text } from '@trycompai/design-system';
import type { ComponentType, ReactNode } from 'react';
import { IsmsEmptyState } from './IsmsEmptyState';

export interface IsmsRegisterShellProps {
  /** Register heading, e.g. "Interested Parties". */
  title: string;
  /** Optional one-line blurb under the title. */
  description?: string;
  /** Number of rows; rendered as a count Badge beside the title. */
  count: number;
  /** Right-aligned slot (typically nothing — add forms render below). */
  actions?: ReactNode;
  /** Icon for the empty state when count is 0. */
  emptyIcon: ComponentType<{ size?: number }>;
  /** Empty-state title shown when there are no rows. */
  emptyTitle: string;
  /** Empty-state description shown when there are no rows. */
  emptyDescription: string;
  /** Table (or list) rendered when count > 0. */
  children: ReactNode;
  /** Optional footer slot (e.g. the inline add form), always rendered. */
  footer?: ReactNode;
}

/**
 * Consistent chrome for every ISMS register: a titled header with a live count
 * Badge, a shared DS Empty state when there are no rows, and a footer slot for
 * the inline add form. Keeps all four registers visually identical.
 */
export function IsmsRegisterShell({
  title,
  description,
  count,
  actions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
  footer,
}: IsmsRegisterShellProps) {
  return (
    <Stack gap="4">
      <HStack align="center" justify="between" gap="3">
        <HStack align="center" gap="2">
          <Heading level="3">{title}</Heading>
          <Badge variant="secondary">{String(count)}</Badge>
        </HStack>
        {actions}
      </HStack>
      {description && (
        <Text size="sm" variant="muted">
          {description}
        </Text>
      )}
      {count === 0 ? (
        <IsmsEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        children
      )}
      {footer}
    </Stack>
  );
}
