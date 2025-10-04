'use client';

import { Code, Code2 } from 'lucide-react';

interface Props {
  type: 'automation' | 'workflow';
}

export function EmptyState({ type }: Props) {
  if (type === 'automation') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm flex flex-col items-center gap-2">
          <Code className="w-10 h-10 text-muted-foreground/60 text-center" />
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-foreground">No Integration Yet</h3>
            <p className="text-sm text-muted-foreground">
              Chat with the Comp AI agent to build your integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
          <Code2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No integration steps found</p>
      </div>
    </div>
  );
}
