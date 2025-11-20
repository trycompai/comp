import type { TextUIPart } from "ai";

import { MarkdownRenderer } from "../../markdown-renderer/markdown-renderer";

export function Text({ part }: { part: TextUIPart }) {
  return (
    <div className="text-foreground text-sm leading-relaxed">
      <MarkdownRenderer content={part.text} />
    </div>
  );
}
