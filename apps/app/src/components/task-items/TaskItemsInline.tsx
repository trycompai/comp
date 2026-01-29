'use client';

import { Button, Section, Stack } from '@trycompai/design-system';
import { Add, Close } from '@trycompai/design-system/icons';
import React from 'react';

interface TaskItemsInlineProps {
  anchorId: string;
  title?: string;
  description?: string;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
  content: React.ReactNode;
  createDialog: React.ReactNode;
}

export function TaskItemsInline({
  anchorId,
  title,
  description,
  isCreateOpen,
  onToggleCreate,
  content,
  createDialog,
}: TaskItemsInlineProps) {
  return (
    <section id={anchorId} className="scroll-mt-24">
      <Section
        title={title}
        description={description}
        actions={
          title ? (
            <Button
              size="icon"
              onClick={onToggleCreate}
              variant={isCreateOpen ? 'outline' : 'default'}
              aria-label={isCreateOpen ? 'Close create task' : 'Create task'}
            >
              {isCreateOpen ? <Close className="h-4 w-4" /> : <Add className="h-4 w-4" />}
            </Button>
          ) : null
        }
      >
        <Stack gap="md">
          {content}
          {createDialog}
        </Stack>
      </Section>
    </section>
  );
}

