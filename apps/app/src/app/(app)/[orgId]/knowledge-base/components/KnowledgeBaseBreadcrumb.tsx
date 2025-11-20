'use client';

import { BookOpen } from 'lucide-react';

export function KnowledgeBaseBreadcrumb() {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 -mx-4 -mt-4 border-b border-border/50 bg-muted/20 px-4 py-3">
      <ol className="flex items-center gap-2">
        <li className="flex items-center">
          <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span>Overview</span>
          </div>
        </li>
      </ol>
    </nav>
  );
}

