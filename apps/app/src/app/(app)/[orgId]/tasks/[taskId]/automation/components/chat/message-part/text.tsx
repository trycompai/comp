import type { TextUIPart } from 'ai';
import { MarkdownRenderer } from '../../markdown-renderer/markdown-renderer';

export function Text({ part }: { part: TextUIPart }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <MarkdownRenderer content={part.text} />
    </div>
  );
}
