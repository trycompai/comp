import { cn } from '@/lib/utils';
import { BotIcon, UserIcon } from 'lucide-react';
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
    // Only auto-expand once or when no selection exists.
    if (expandedReasoningIndex === null && reasoningParts.length > 0) {
      const latestReasoningIndex = reasoningParts[reasoningParts.length - 1].index;
      setExpandedReasoningIndex(latestReasoningIndex);
    }
  }, [reasoningParts, expandedReasoningIndex]);

  return (
    <ReasoningContext.Provider value={{ expandedReasoningIndex, setExpandedReasoningIndex }}>
      <div
        className={cn({
          'group relative': true,
          'mr-8 lg:mr-20': message.role === 'assistant',
          'ml-8 lg:ml-20': message.role === 'user',
        })}
      >
        <div
          className={cn({
            'relative p-6 lg:p-8 rounded-sm transition-all duration-500': true,
            // Assistant messages - clean background
            'bg-card border border-border shadow-sm hover:shadow-md': message.role === 'assistant',
            // User messages - subtle accent background for contrast
            'bg-muted/30 border border-border shadow-md hover:shadow-lg': message.role === 'user',
          })}
        >
          {/* Message Header */}
          <div className="flex items-center gap-4 mb-6">
            {message.role === 'user' ? (
              <>
                <div className="ml-auto p-2 rounded-sm bg-primary text-primary-foreground">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">You</span>
              </>
            ) : (
              <>
                <div className="p-2 rounded-sm bg-primary border border-primary">
                  <BotIcon className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Assistant</span>
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                    {message.metadata?.model}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Message Content */}
          <div className="space-y-4 relative z-10">
            {(() => {
              // Reorder parts to ensure text messages appear before tool UI components
              const reorderedParts = [...message.parts];
              const promptParts = ['tool-promptForSecret', 'tool-promptForInfo'];

              // Sort so that prompt tool parts come after text parts
              reorderedParts.sort((a, b) => {
                const aIsPrompt = promptParts.includes(a.type);
                const bIsPrompt = promptParts.includes(b.type);
                const aIsText = a.type === 'text';
                const bIsText = b.type === 'text';

                // If one is text and the other is a prompt tool, text comes first
                if (aIsText && bIsPrompt) return -1;
                if (bIsText && aIsPrompt) return 1;

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

          {/* Clean depth separator */}
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>
    </ReasoningContext.Provider>
  );
});
