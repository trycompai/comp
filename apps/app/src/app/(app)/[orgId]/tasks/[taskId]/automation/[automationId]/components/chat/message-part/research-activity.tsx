"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Globe, Loader2, Search, XCircle } from "lucide-react";

interface ResearchActivityProps {
  toolName: "exaSearch" | "firecrawl";
  input: any;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  output?: any;
  isAnimating: boolean;
}

export function ResearchActivity({
  toolName,
  input,
  state,
  output,
  isAnimating,
}: ResearchActivityProps) {
  const isComplete = state === "output-available";
  const isError = state === "output-error";
  const isLoading = state === "input-streaming" || state === "input-available";
  const [startTime] = useState(() => Date.now());
  const [duration, setDuration] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Track actual timing
  useEffect(() => {
    if ((isComplete || isError) && duration === null) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }
  }, [isComplete, isError, startTime, duration]);

  const getIcon = () => {
    if (isError) return <XCircle className="text-muted-foreground h-4 w-4" />;
    if (isComplete)
      return <CheckCircle2 className="text-muted-foreground h-4 w-4" />;
    if (isLoading)
      return <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />;
    return toolName === "exaSearch" ? (
      <Search className="text-muted-foreground h-4 w-4" />
    ) : (
      <Globe className="text-muted-foreground h-4 w-4" />
    );
  };

  const getTitle = () => {
    if (isError) {
      return duration
        ? `Research failed after ${duration}s`
        : "Research encountered an issue";
    }

    if (toolName === "exaSearch") {
      if (isComplete && duration !== null) {
        const results = output?.results || [];
        if (results.length === 0) {
          return `Searched for ${duration}s - No results found`;
        }
        return `Searched for ${duration}s - Found relevant documentation`;
      }
      return "Searching...";
    }

    if (isComplete && duration !== null) {
      return `Researched for ${duration}s - Successfully gathered information`;
    }
    return "Researching...";
  };

  const getResultSummary = () => {
    // Only show summary when complete and available
    if (!isComplete || !output?.summary) return null;

    return (
      <div className="mt-2">
        <p className="text-muted-foreground text-xs">{output.summary}</p>
      </div>
    );
  };

  return (
    <div className="py-0.5">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="bg-muted-foreground/40 h-1 w-1 rounded-full" />
        <span>{getTitle()}</span>
      </button>
      {isExpanded && (isComplete || isError) && output?.summary && (
        <div className="text-muted-foreground/80 mt-1 ml-3 text-xs leading-relaxed">
          {output.summary}
        </div>
      )}
    </div>
  );
}
