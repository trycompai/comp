import type { ReasoningUIPart } from "ai";
import { useEffect, useState } from "react";

import { useReasoningContext } from "../message";

export function Reasoning({
  part,
  partIndex,
}: {
  part: ReasoningUIPart;
  partIndex: number;
}) {
  const context = useReasoningContext();
  const isExpanded = context?.expandedReasoningIndex === partIndex;
  const [startTime] = useState(() => Date.now());
  const [duration, setDuration] = useState<number | null>(null);

  const text = part.text || "";
  const isStreaming = part.state === "streaming";
  const firstLine = text.split("\n")[0].replace(/\*\*/g, "");
  const hasMoreContent = text.includes("\n") || text.length > 80;

  // Track actual timing
  useEffect(() => {
    if (part.state === "done" && duration === null) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }
  }, [part.state, startTime, duration]);

  // Early return after all hooks
  if (part.state === "done" && !part.text) {
    return null;
  }

  const getReasoningLabel = () => {
    if (isStreaming) return "Thinking...";
    if (duration !== null) return `Thought for ${duration}s`;
    return "Thinking...";
  };

  const summarize = (s: string) => {
    let t = (s || "").trim();
    t = t.replace(/^(_|\*)*thinking:?(_|\*)*\s*/i, "");
    t = t.replace(/^i\s*(?:'m| am)\s+/i, "");
    t = t.replace(/^i\s*(?:'ll| will)\s+/i, "");
    t = t.replace(/^let me\s+/i, "");
    t = t.replace(/^now\s+/i, "");
    t = t.replace(/^okay,?\s*/i, "");
    t = t.replace(/^i\s+(?:need|want|will|can|should)\s+to\s+/i, "");
    t = t.replace(/^i\s+/i, "");
    if (t.length > 80) t = t.slice(0, 77) + "…";
    return t;
  };
  const summary = summarize(firstLine);

  const handleClick = () => {
    if (context) {
      const newIndex = isExpanded ? null : partIndex;
      context.setExpandedReasoningIndex(newIndex);
    }
  };

  return (
    <div className="text-muted-foreground bg-muted border-border rounded-sm border px-3 py-2 text-xs leading-6">
      <button
        type="button"
        className="group/btn flex w-full items-center gap-2.5 text-left transition-all duration-200"
        onClick={handleClick}
      >
        <span
          className={`block truncate text-xs ${isStreaming ? "thinking-text" : "text-muted-foreground"}`}
        >
          {getReasoningLabel()}
        </span>
      </button>
    </div>
  );
}
