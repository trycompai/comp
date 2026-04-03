'use client';

import { Text } from '@trycompai/design-system';
import { Checkmark, Search } from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';

export type MessageType = 'searching' | 'found' | 'analyzing' | 'error';

export type ResearchMessage = {
  text: string;
  type: MessageType;
  timestamp: number;
};

interface VendorResearchFeedProps {
  messages: ResearchMessage[];
  isActive: boolean;
  vendorName?: string;
}

const MAX_VISIBLE = 6;

function FeedMessage({
  message,
  position,
}: {
  message: ResearchMessage;
  position: number; // 0 = newest, higher = older
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isFound = message.type === 'found';
  const isError = message.type === 'error';
  const fadeOpacity =
    position <= 1 ? 1 : position === 2 ? 0.7 : position === 3 ? 0.45 : 0.25;

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-500 ease-out ${
        visible ? 'translate-x-0' : '-translate-x-4'
      } ${isError ? 'bg-destructive/10' : ''}`}
      style={{
        opacity: visible ? fadeOpacity : 0,
        transition: 'opacity 500ms ease-out, transform 500ms ease-out',
      }}
    >
      <span className="shrink-0">
        {message.type === 'found' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
            <Checkmark size={12} className="text-success" />
          </span>
        )}
        {message.type === 'searching' && (
          <span className="flex h-5 w-5 items-center justify-center">
            <Search size={14} className="text-primary animate-pulse" />
          </span>
        )}
        {message.type === 'analyzing' && (
          <span className="flex h-5 w-5 items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-foreground/50 border-t-transparent animate-spin" />
          </span>
        )}
        {message.type === 'error' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-xs font-bold">
            !
          </span>
        )}
      </span>
      <span
        className={`text-sm font-mono tracking-tight ${
          isFound
            ? 'text-success font-medium'
            : isError
              ? 'text-destructive'
              : 'text-muted-foreground'
        }`}
      >
        {message.text}
      </span>
    </div>
  );
}

export function VendorResearchFeed({
  messages,
  isActive,
  vendorName,
}: VendorResearchFeedProps) {
  // Only show the last N messages, newest at bottom
  const visibleMessages = messages.slice(-MAX_VISIBLE);

  // Count real findings
  const foundCount = messages.filter((m) => m.type === 'found').length;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-card to-card/80 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/80" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
            )}
            <Text size="sm" weight="semibold">
              {isActive
                ? `Researching ${vendorName ?? 'vendor'} security posture`
                : 'Research complete'}
            </Text>
          </div>
          {foundCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {foundCount} {foundCount === 1 ? 'finding' : 'findings'}
            </span>
          )}
        </div>
      </div>

      {/* Message feed — only last N messages, older ones fade */}
      <div className="px-4 pb-4">
        <div className="space-y-1">
          {visibleMessages.map((msg, i) => {
            const position = visibleMessages.length - 1 - i;
            return (
              <FeedMessage
                key={`${msg.timestamp}-${msg.text}`}
                message={msg}
                position={position}
              />
            );
          })}
          {isActive && messages.length > 0 && (
            <div className="flex items-center gap-3 py-2 px-3 opacity-40">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
