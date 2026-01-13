'use client';

import { Button } from '@comp/ui/button';
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
    </Button>
  );
}
