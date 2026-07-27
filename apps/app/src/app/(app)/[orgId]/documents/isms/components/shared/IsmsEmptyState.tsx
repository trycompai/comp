import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import type { ComponentType, ReactNode } from 'react';

export interface IsmsEmptyStateProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  description: string;
  /** Optional CTA (typically a Button or Link-wrapped Button). */
  action?: ReactNode;
  /**
   * Tightens the zero state for use inside a card/section (no large
   * dashed `flex-1` band). Use for inline registers like control mappings.
   */
  compact?: boolean;
}

/**
 * Standard ISMS empty / zero state. Thin wrapper over the DS Empty primitive so
 * every ISMS page renders an identical, well-spaced zero state. Pass `compact`
 * for inline contexts (inside a Section card) where the full-page band is too
 * tall.
 */
export function IsmsEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: IsmsEmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon size={16} />
        </div>
        <Stack gap="1" align="center">
          <Text size="sm" weight="medium">
            {title}
          </Text>
          <Text size="sm" variant="muted">
            {description}
          </Text>
        </Stack>
        {action}
      </div>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon size={24} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
