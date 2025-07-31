import { type StreamableValue, readStreamableValue } from '@ai-sdk/rsc';
import { useEffect, useState, useTransition } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useStreamableText(
  content: string | StreamableValue<string>,
  debounceMs = 200,
): string {
  const [rawContent, setRawContent] = useState(typeof content === 'string' ? content : '');
  const [isPending, startTransition] = useTransition();
  const debouncedContent = useDebounce(rawContent, debounceMs);

  useEffect(() => {
    if (typeof content === 'string') {
      setRawContent(content);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      let accumulated = '';
      try {
        for await (const delta of readStreamableValue(content)) {
          if (signal.aborted) break;
          if (typeof delta === 'string') {
            accumulated += delta;
            startTransition(() => {
              setRawContent(accumulated);
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        throw error;
      }
    })();

    return () => {
      controller.abort();
    };
  }, [content]);

  return debouncedContent;
}
