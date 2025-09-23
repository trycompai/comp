'use client';

import { Code2, Zap } from 'lucide-react';

interface Props {
  type: 'automation' | 'workflow';
}

export function EmptyState({ type }: Props) {
  if (type === 'automation') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
            <Zap className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Automation Yet</h3>
          <p className="text-sm text-muted-foreground">
            Chat with the AI assistant to build your automation workflow
          </p>
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
        <p className="text-muted-foreground">No workflow steps found</p>
      </div>
    </div>
  );
}
