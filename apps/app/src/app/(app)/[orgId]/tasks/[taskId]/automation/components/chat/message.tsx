import { UserIcon } from 'lucide-react';
import Image from 'next/image';
import { createContext, memo, useContext, useEffect, useState } from 'react';
import { MessagePart } from './message-part';
import type { ChatUIMessage } from './types';

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
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<number | null>(null);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const reasoningParts = message.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.type === 'reasoning');

  useEffect(() => {
    // Prefer expanding the latest streaming reasoning part if present.
    const latestStreaming = [...reasoningParts]
      .reverse()
      .find(({ part }) => (part as any)?.state === 'streaming');
    if (latestStreaming && latestStreaming.index !== expandedReasoningIndex) {
      setExpandedReasoningIndex(latestStreaming.index);
      return;
    }

    // Otherwise, if nothing expanded yet, expand the latest reasoning block.
    if (expandedReasoningIndex === null && reasoningParts.length > 0) {
      const latestReasoningIndex = reasoningParts[reasoningParts.length - 1].index;
      setExpandedReasoningIndex(latestReasoningIndex);
    }
  }, [reasoningParts, expandedReasoningIndex]);

  return (
    <ReasoningContext.Provider value={{ expandedReasoningIndex, setExpandedReasoningIndex }}>
      <div className="group relative flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors duration-150 z-10">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {message.role === 'user' ? (
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-primary" />
            </div>
          ) : (
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white border border-primary/25 overflow-hidden flex items-center justify-center">
                <Image
                  src="/compailogo.jpg"
                  alt="Comp AI"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover object-center"
                  unoptimized
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Clean and simple */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {message.role === 'user' ? 'You' : 'Comp AI'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            {(() => {
              const hasStreamingReasoning = message.parts.some(
                (part) => part.type === 'reasoning' && (part as any)?.state === 'streaming',
              );

              const hasTextContent = message.parts.some((part) => part.type === 'text');

              const allReasoningParts = message.parts.filter((part) => part.type === 'reasoning');
              const allResearchParts = message.parts.filter(
                (part) => part.type === 'tool-exaSearch' || part.type === 'tool-firecrawl',
              );

              // Show thinking if actively streaming OR if we have reasoning but no text yet
              const isStillThinking =
                hasStreamingReasoning || (allReasoningParts.length > 0 && !hasTextContent);

              const hasStreamingResearch = allResearchParts.some(
                (part) =>
                  (part as any)?.state === 'input-streaming' ||
                  (part as any)?.state === 'input-available',
              );

              const result = [];
              let hasShownThinking = false;
              let hasShownResearch = false;

              // Render parts in their ORIGINAL order, but consolidate reasoning and research
              for (let i = 0; i < message.parts.length; i++) {
                const part = message.parts[i];

                // Consolidate reasoning
                if (part.type === 'reasoning') {
                  if (!hasShownThinking) {
                    hasShownThinking = true;
                    if (isStillThinking) {
                      result.push(
                        <div key="thinking-active" className="flex items-center gap-2 py-1">
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>,
                      );
                    } else {
                      result.push(
                        <div key="thinking-done" className="flex items-center gap-2 py-1">
                          <span className="text-xs text-muted-foreground">
                            Thought for{' '}
                            {Math.max(
                              1,
                              Math.round(
                                allReasoningParts.reduce((total, part) => {
                                  const text = (part as any)?.text || '';
                                  return total + Math.floor(text.length / 100);
                                }, 0),
                              ),
                            )}
                            s
                          </span>
                        </div>,
                      );
                    }
                  }
                  continue;
                }

                // Consolidate research
                if (part.type === 'tool-exaSearch' || part.type === 'tool-firecrawl') {
                  if (!hasShownResearch) {
                    hasShownResearch = true;
                    const totalResearchTime = allResearchParts.reduce((total, part) => {
                      const output = (part as any)?.output;
                      const summary = output?.summary || '';
                      return total + Math.max(1, Math.floor(summary.length / 50));
                    }, 0);

                    if (hasStreamingResearch) {
                      result.push(
                        <div key="research-active" className="flex items-center gap-2 py-1">
                          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs text-muted-foreground">Researching...</span>
                        </div>,
                      );
                    } else if (allResearchParts.length > 0) {
                      result.push(
                        <div key="research-done" className="flex items-center gap-2 py-1">
                          <span className="text-xs text-muted-foreground">
                            Researched for {Math.max(1, totalResearchTime)}s
                          </span>
                        </div>,
                      );
                    }
                  }
                  continue;
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

              return result;
            })()}
          </div>
        </div>
      </div>
    </ReasoningContext.Provider>
  );
});
