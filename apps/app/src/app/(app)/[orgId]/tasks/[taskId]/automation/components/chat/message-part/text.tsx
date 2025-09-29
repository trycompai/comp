import type { TextUIPart } from 'ai';
import { MarkdownRenderer } from '../../markdown-renderer/markdown-renderer';

export function Text({ part }: { part: TextUIPart }) {
  return (
    <div className="text-sm leading-relaxed text-foreground bg-muted/20 border border-border rounded-xs p-3">
      <MarkdownRenderer content={part.text} />
    </div>
  );
}
