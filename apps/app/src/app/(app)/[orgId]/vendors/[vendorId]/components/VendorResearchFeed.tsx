'use client';

import { CardContent, Text } from '@trycompai/design-system';
import { Checkmark, Search } from '@trycompai/design-system/icons';
import { AnimatedSizeContainer } from '@trycompai/ui/animated-size-container';
import { useEffect, useRef, useState, useCallback } from 'react';

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

// Filler messages shown between real updates to keep the feed alive
const FILLER_MESSAGES = [
  'Scanning security documentation...',
  'Reviewing compliance certifications...',
  'Checking data processing agreements...',
  'Analyzing security headers...',
  'Reviewing incident response policies...',
  'Checking encryption standards...',
  'Scanning for vulnerability disclosures...',
  'Reviewing access control policies...',
  'Checking business continuity plans...',
  'Analyzing third-party audit reports...',
];

function FeedMessage({ message }: { message: ResearchMessage }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isFound = message.type === 'found';
  const isError = message.type === 'error';

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-500 ease-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      } ${isFound ? 'bg-success/10' : ''} ${isError ? 'bg-destructive/10' : ''}`}
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

/**
 * Drip-feeds messages with a delay so they appear one-at-a-time,
 * and injects simulated "scanning..." messages during long pauses.
 */
function useDripFeed(
  realMessages: ResearchMessage[],
  isActive: boolean,
): ResearchMessage[] {
  const [displayed, setDisplayed] = useState<ResearchMessage[]>([]);
  const queueRef = useRef<ResearchMessage[]>([]);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillerIndexRef = useRef(0);
  const lastRealCountRef = useRef(0);

  // Queue new real messages as they arrive
  useEffect(() => {
    const newMessages = realMessages.slice(lastRealCountRef.current);
    if (newMessages.length > 0) {
      queueRef.current.push(...newMessages);
      lastRealCountRef.current = realMessages.length;
    }
  }, [realMessages]);

  // Drain queue one message at a time with delay
  const drainOne = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift()!;
    setDisplayed((prev) => [...prev, next]);

    if (queueRef.current.length > 0) {
      drainTimerRef.current = setTimeout(drainOne, 600);
    }
  }, []);

  useEffect(() => {
    if (queueRef.current.length > 0 && !drainTimerRef.current) {
      drainOne();
    }
    const interval = setInterval(() => {
      if (queueRef.current.length > 0 && !drainTimerRef.current) {
        drainOne();
      }
    }, 300);
    return () => clearInterval(interval);
  }, [realMessages, drainOne]);

  // Inject filler messages during long silences
  useEffect(() => {
    if (!isActive) {
      if (fillerTimerRef.current) clearInterval(fillerTimerRef.current);
      return;
    }

    fillerTimerRef.current = setInterval(() => {
      // Only inject filler if queue is empty (no real messages waiting)
      if (queueRef.current.length === 0) {
        const text =
          FILLER_MESSAGES[fillerIndexRef.current % FILLER_MESSAGES.length];
        fillerIndexRef.current++;
        setDisplayed((prev) => [
          ...prev,
          { text, type: 'searching' as MessageType, timestamp: Date.now() },
        ]);
      }
    }, 4000);

    return () => {
      if (fillerTimerRef.current) clearInterval(fillerTimerRef.current);
    };
  }, [isActive]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (drainTimerRef.current) clearTimeout(drainTimerRef.current);
      if (fillerTimerRef.current) clearInterval(fillerTimerRef.current);
    };
  }, []);

  return displayed;
}

export function VendorResearchFeed({
  messages,
  isActive,
  vendorName,
}: VendorResearchFeedProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const displayedMessages = useDripFeed(messages, isActive);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [displayedMessages.length]);

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-card to-card/80 shadow-lg overflow-hidden">
      {/* Header with accent bar */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/80" />
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
      </div>

      {/* Message feed */}
      <div className="px-4 pb-4">
        <AnimatedSizeContainer width={false}>
          <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-thin">
            {displayedMessages.map((msg, i) => (
              <FeedMessage
                key={`${msg.timestamp}-${i}`}
                message={msg}
              />
            ))}
            {isActive && displayedMessages.length > 0 && (
              <div className="flex items-center gap-3 py-2 px-3 opacity-40">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            )}
            <div ref={feedEndRef} />
          </div>
        </AnimatedSizeContainer>
      </div>
    </div>
  );
}
