import * as React from 'react';

import { Heading } from './heading';
import { Stack } from './stack';
import { Text } from './text';

interface PageHeaderProps extends Omit<React.ComponentProps<'div'>, 'className'> {
  title: string;
  description?: string;
  /** Additional descriptive text below description */
  meta?: string;
  actions?: React.ReactNode;
}

function PageHeader({ title, description, meta, actions, children, ...props }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className="flex items-center justify-between gap-4" {...props}>
      <Stack gap="1">
        <Heading level="1">{title}</Heading>
        {description && (
          <Text size="sm" variant="muted">
            {description}
          </Text>
        )}
        {meta && (
          <Text size="xs" variant="muted">
            {meta}
          </Text>
        )}
        {children}
      </Stack>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

function PageHeaderTitle({ ...props }: Omit<React.ComponentProps<typeof Heading>, 'className'>) {
  return <Heading data-slot="page-header-title" level="1" {...props} />;
}

function PageHeaderDescription({ ...props }: Omit<React.ComponentProps<typeof Text>, 'className'>) {
  return <Text data-slot="page-header-description" size="sm" variant="muted" {...props} />;
}

function PageHeaderActions({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div data-slot="page-header-actions" className="flex shrink-0 items-center gap-3" {...props} />
  );
}

export { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderTitle };
