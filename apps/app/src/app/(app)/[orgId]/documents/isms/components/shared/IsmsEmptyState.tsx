import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@trycompai/design-system';
import type { ComponentType, ReactNode } from 'react';

export interface IsmsEmptyStateProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  description: string;
  /** Optional CTA (typically a Button or Link-wrapped Button). */
  action?: ReactNode;
}

/**
 * Standard ISMS empty / zero state. Thin wrapper over the DS Empty primitive so
 * every ISMS page renders an identical, well-spaced zero state.
 */
export function IsmsEmptyState({ icon: Icon, title, description, action }: IsmsEmptyStateProps) {
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
