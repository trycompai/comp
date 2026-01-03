import * as React from 'react';

import { Heading } from './heading';
import { Stack } from './stack';
import { Text } from './text';

interface SectionProps extends Omit<React.ComponentProps<'section'>, 'className'> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Gap between header and content. Default is "4" */
  gap?: '2' | '3' | '4' | '6' | '8';
}

function Section({ title, description, actions, gap = '4', children, ...props }: SectionProps) {
  const hasHeader = title || description || actions;

  return (
    <section data-slot="section" className="w-full" {...props}>
      <Stack gap={gap}>
        {hasHeader && (
          <div className="flex items-start justify-between gap-4">
            <Stack gap="1">
              {title && <Heading level="3">{title}</Heading>}
              {description && (
                <Text size="sm" variant="muted">
                  {description}
                </Text>
              )}
            </Stack>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </Stack>
    </section>
  );
}

function SectionHeader({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div data-slot="section-header" className="flex items-start justify-between gap-4" {...props} />
  );
}

function SectionTitle({ ...props }: Omit<React.ComponentProps<typeof Heading>, 'className'>) {
  return <Heading data-slot="section-title" level="3" {...props} />;
}

function SectionDescription({ ...props }: Omit<React.ComponentProps<typeof Text>, 'className'>) {
  return <Text data-slot="section-description" size="sm" variant="muted" {...props} />;
}

function SectionActions({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div data-slot="section-actions" className="flex shrink-0 items-center gap-2" {...props} />
  );
}

function SectionContent({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="section-content" className="w-full" {...props} />;
}

export { Section, SectionActions, SectionContent, SectionDescription, SectionHeader, SectionTitle };
