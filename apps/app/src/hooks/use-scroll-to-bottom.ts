import { type RefObject, useEffect, useRef } from 'react';

export function useScrollToBottom(): [RefObject<HTMLDivElement>, RefObject<HTMLDivElement>] {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver(() => {
        end.scrollIntoView({ behavior: 'instant', block: 'end' });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  // @ts-expect-error error
  return [containerRef, endRef];
}
