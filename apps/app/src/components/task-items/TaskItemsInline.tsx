'use client';

import { Button } from '@comp/ui/button';
import { Plus, X } from 'lucide-react';
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
    <section id={anchorId} className="scroll-mt-24 space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
          </div>
          <Button
            size="icon"
            onClick={onToggleCreate}
            variant={isCreateOpen ? 'outline' : 'default'}
            aria-label={isCreateOpen ? 'Close create task' : 'Create task'}
            className="transition-all duration-200"
          >
            <span className="relative inline-flex items-center justify-center">
              <Plus
                className={`h-4 w-4 absolute transition-all duration-200 ${
                  isCreateOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`h-4 w-4 absolute transition-all duration-200 ${
                  isCreateOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                }`}
              />
            </span>
          </Button>
        </div>
      )}
      {content}
      {createDialog}
    </section>
  );
}

