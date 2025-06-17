'use client';

import { Button } from '@comp/ui/button';
import { useMediaQuery } from '@comp/ui/hooks';
import { cn } from '@comp/ui/cn';
import { useQueryState } from 'nuqs';

export function AssistantButton() {
  const [, setAssistantOpen] = useQueryState('assistant', {
    history: 'push',
    parse: (value) => value === 'true',
    serialize: (value) => value.toString(),
  });

  return (
    <Button variant="ghost" size="default" onClick={() => setAssistantOpen(true)}>
      <span className="truncate">Ask a question...</span>
      <kbd className="bg-muted ml-auto flex h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
