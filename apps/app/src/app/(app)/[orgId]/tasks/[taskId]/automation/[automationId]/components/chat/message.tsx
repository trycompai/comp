import { createContext, memo, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { UserIcon } from "lucide-react";

import type { ChatUIMessage } from "./types";
import { MessagePart } from "./message-part";

interface Props {
  message: ChatUIMessage;
  orgId?: string;
  onSecretAdded?: (secretName: string) => void;
  onInfoProvided?: (info: Record<string, string>) => void;
}

interface ReasoningContextType {
  expandedReasoningIndex: number | null;
  setExpandedReasoningIndex: (index: number | null) => void;
}

const ReasoningContext = createContext<ReasoningContextType | null>(null);

export const useReasoningContext = () => {
  const context = useContext(ReasoningContext);
  return context;
};

export const Message = memo(function Message({
  message,
  orgId,
  onSecretAdded,
  onInfoProvided,
}: Props) {
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
    number | null
  >(null);

  const reasoningParts = message.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.type === "reasoning");

  useEffect(() => {
    // Prefer expanding the latest streaming reasoning part if present.
    const latestStreaming = [...reasoningParts]
      .reverse()
      .find(({ part }) => (part as any)?.state === "streaming");
    if (latestStreaming && latestStreaming.index !== expandedReasoningIndex) {
      setExpandedReasoningIndex(latestStreaming.index);
      return;
    }

    // Otherwise, if nothing expanded yet, expand the latest reasoning block.
    if (expandedReasoningIndex === null && reasoningParts.length > 0) {
      const latestReasoningIndex =
        reasoningParts[reasoningParts.length - 1].index;
      setExpandedReasoningIndex(latestReasoningIndex);
    }
  }, [reasoningParts, expandedReasoningIndex]);

  const renderMessageParts = () => {
    const hasStreamingReasoning = message.parts.some(
      (part) =>
        part.type === "reasoning" && (part as any)?.state === "streaming",
    );

    const hasTextContent = message.parts.some((part) => part.type === "text");

    const allReasoningParts = message.parts.filter(
      (part) => part.type === "reasoning",
    );
    const allResearchParts = message.parts.filter(
      (part) =>
        part.type === "tool-exaSearch" || part.type === "tool-firecrawl",
    );

    // Show thinking only if actively streaming reasoning AND no other content yet
    const hasAnyOtherContent = hasTextContent || allResearchParts.length > 0;
    const isStillThinking = hasStreamingReasoning && !hasAnyOtherContent;

    const hasStreamingResearch = allResearchParts.some(
      (part) =>
        (part as any)?.state === "input-streaming" ||
        (part as any)?.state === "input-available",
    );

    const result = [];
    let thinkingSessionCount = 0;
    let researchSessionCount = 0;
    let fileWritingSessionCount = 0;
    let currentThinkingParts = [];
    let currentResearchParts = [];
    let currentFileWritingParts = [];

    // Render parts in their ORIGINAL order, creating new sessions when needed
    for (let i = 0; i < message.parts.length; i++) {
      const part = message.parts[i];

      // Collect reasoning parts for current session
      if (part.type === "reasoning") {
        currentThinkingParts.push(part);
        continue;
      }

      // Collect research parts for current session
      if (part.type === "tool-exaSearch" || part.type === "tool-firecrawl") {
        currentResearchParts.push(part);
        continue;
      }

      // Collect file writing parts for current session
      if (part.type === "tool-storeToS3") {
        currentFileWritingParts.push(part);
        continue;
      }

      // When we hit other content, flush any accumulated sessions

      // Flush thinking session
      if (currentThinkingParts.length > 0) {
        const sessionId = thinkingSessionCount++;
        const sessionTime = currentThinkingParts.reduce(
          (total, reasoningPart) => {
            const text = (reasoningPart as any)?.text || "";
            return total + Math.floor(text.length / 100);
          },
          0,
        );

        // Check if THIS session is still streaming
        const thisSessionIsThinking = currentThinkingParts.some(
          (part) => (part as any)?.state === "streaming",
        );

        if (thisSessionIsThinking) {
          result.push(
            <div
              key={`thinking-${sessionId}-active`}
              className="flex items-center gap-2 py-1"
            >
              <span className="thinking-text text-xs">Thinking...</span>
            </div>,
          );
        } else {
          result.push(
            <div
              key={`thinking-${sessionId}-done`}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-muted-foreground text-xs">
                Thought for {Math.max(1, sessionTime)}s
              </span>
            </div>,
          );
        }
        currentThinkingParts = [];
      }

      // Flush research session
      if (currentResearchParts.length > 0) {
        const sessionId = researchSessionCount++;
        const sessionTime = currentResearchParts.reduce(
          (total, researchPart) => {
            const output = (researchPart as any)?.output;
            const summary = output?.summary || "";
            return total + Math.max(1, Math.floor(summary.length / 50));
          },
          0,
        );

        // Check if THIS session has streaming research (not all research globally)
        const thisSessionIsStreaming = currentResearchParts.some(
          (part) =>
            (part as any)?.state === "input-streaming" ||
            (part as any)?.state === "input-available",
        );

        if (thisSessionIsStreaming) {
          result.push(
            <div
              key={`research-${sessionId}-active`}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-muted-foreground text-xs">
                Researching...
              </span>
            </div>,
          );
        } else {
          result.push(
            <div
              key={`research-${sessionId}-done`}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-muted-foreground text-xs">
                Researched for {Math.max(1, sessionTime)}s
              </span>
            </div>,
          );
        }
        currentResearchParts = [];
      }

      // Flush file writing session
      if (currentFileWritingParts.length > 0) {
        const sessionId = fileWritingSessionCount++;

        // Check if THIS session has streaming file writing
        const thisSessionIsWriting = currentFileWritingParts.some(
          (part) =>
            (part as any)?.state === "input-streaming" ||
            (part as any)?.state === "input-available",
        );

        if (thisSessionIsWriting) {
          result.push(
            <div
              key={`filewriting-${sessionId}-active`}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-muted-foreground text-xs">
                Creating automation...
              </span>
            </div>,
          );
        } else {
          // When complete, show the saved message
          result.push(
            <div
              key={`filewriting-${sessionId}-done`}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-muted-foreground text-xs">Saved</span>
            </div>,
          );
        }
        currentFileWritingParts = [];
      }

      // Render all other parts (text, tools, etc.)
      result.push(
        <MessagePart
          key={`part-${i}`}
          part={part}
          partIndex={i}
          orgId={orgId}
          onSecretAdded={onSecretAdded}
          onInfoProvided={onInfoProvided}
        />,
      );
    }

    // Flush any remaining sessions at the end
    if (currentThinkingParts.length > 0) {
      const sessionId = thinkingSessionCount++;
      const sessionTime = currentThinkingParts.reduce(
        (total, reasoningPart) => {
          const text = (reasoningPart as any)?.text || "";
          return total + Math.floor(text.length / 100);
        },
        0,
      );

      // Check if THIS final session is still streaming
      const finalThinkingIsActive = currentThinkingParts.some(
        (part) => (part as any)?.state === "streaming",
      );

      if (finalThinkingIsActive) {
        result.push(
          <div
            key={`thinking-${sessionId}-active`}
            className="flex items-center gap-2 py-1"
          >
            <span className="thinking-text text-xs">Thinking...</span>
          </div>,
        );
      } else {
        result.push(
          <div
            key={`thinking-${sessionId}-done`}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-muted-foreground text-xs">
              Thought for {Math.max(1, sessionTime)}s
            </span>
          </div>,
        );
      }
    }

    if (currentResearchParts.length > 0) {
      const sessionId = researchSessionCount++;
      const sessionTime = currentResearchParts.reduce((total, researchPart) => {
        const output = (researchPart as any)?.output;
        const summary = output?.summary || "";
        return total + Math.max(1, Math.floor(summary.length / 50));
      }, 0);

      // Check if THIS final session has streaming research
      const finalSessionIsStreaming = currentResearchParts.some(
        (part) =>
          (part as any)?.state === "input-streaming" ||
          (part as any)?.state === "input-available",
      );

      if (finalSessionIsStreaming) {
        result.push(
          <div
            key={`research-${sessionId}-active`}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-muted-foreground text-xs">
              Researching...
            </span>
          </div>,
        );
      } else {
        result.push(
          <div
            key={`research-${sessionId}-done`}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-muted-foreground text-xs">
              Researched for {Math.max(1, sessionTime)}s
            </span>
          </div>,
        );
      }
    }

    if (currentFileWritingParts.length > 0) {
      const sessionId = fileWritingSessionCount++;

      // Check if THIS final session has streaming file writing
      const finalSessionIsWriting = currentFileWritingParts.some(
        (part) =>
          (part as any)?.state === "input-streaming" ||
          (part as any)?.state === "input-available",
      );

      if (finalSessionIsWriting) {
        result.push(
          <div
            key={`filewriting-${sessionId}-active`}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-muted-foreground text-xs">
              Creating automation...
            </span>
          </div>,
        );
      } else {
        result.push(
          <div
            key={`filewriting-${sessionId}-done`}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-muted-foreground text-xs">Saved</span>
          </div>,
        );
      }
    }

    return result;
  };

  return (
    <ReasoningContext.Provider
      value={{ expandedReasoningIndex, setExpandedReasoningIndex }}
    >
      <div className="group hover:bg-muted/30 relative z-10 flex gap-3 px-4 py-3 transition-colors duration-150">
        {/* Avatar */}
        <div className="mt-0.5 flex-shrink-0">
          {message.role === "user" ? (
            <div className="bg-primary/10 border-primary/20 flex h-8 w-8 items-center justify-center rounded-full border">
              <UserIcon className="text-primary h-4 w-4" />
            </div>
          ) : (
            <div className="relative">
              <div className="border-primary/25 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-white">
                <Image
                  src="/compailogo.jpg"
                  alt="Comp AI"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover object-center"
                  unoptimized
                />
              </div>
              <div className="border-background absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 bg-green-500" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="min-w-0 flex-1">
          {/* Header - Clean and simple */}
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-foreground text-sm font-semibold">
              {message.role === "user" ? "You" : "Comp AI"}
            </span>
            <span className="text-muted-foreground text-xs">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">{renderMessageParts()}</div>
        </div>
      </div>
    </ReasoningContext.Provider>
  );
});
