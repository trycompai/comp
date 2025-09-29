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
      <div className="group relative flex gap-3 px-4 py-2 transition-colors duration-150 z-10">
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
          <div className="flex flex-col gap-1">
            {(() => {
              // Reorder parts to ensure text messages appear before tool UI components
              const reorderedParts = [...message.parts];
              const uiToolParts = [
                'tool-promptForSecret',
                'tool-promptForInfo',
                'tool-exaSearch',
                'tool-firecrawl',
              ];

              // Sort so that UI tool parts come after text parts
              reorderedParts.sort((a, b) => {
                const aIsUITool = uiToolParts.includes(a.type);
                const bIsUITool = uiToolParts.includes(b.type);
                const aIsText = a.type === 'text';
                const bIsText = b.type === 'text';

                // If one is text and the other is a UI tool, text comes first
                if (aIsText && bIsUITool) return -1;
                if (bIsText && aIsUITool) return 1;

                // Otherwise maintain original order
                return 0;
              });

              return reorderedParts.map((part, index) => (
                <MessagePart
                  key={`${part.type}-${index}`}
                  part={part}
                  partIndex={message.parts.indexOf(part)}
                  orgId={orgId}
                  onSecretAdded={onSecretAdded}
                  onInfoProvided={onInfoProvided}
                />
              ));
            })()}
          </div>
        </div>
      </div>
    </ReasoningContext.Provider>
  );
});
