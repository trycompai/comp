'use client';

import { Text } from '@trycompai/design-system';
import { Checkmark, Search } from '@trycompai/design-system/icons';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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

// These describe what the agent is DOING, not what it found.
// Never imply specific findings — only real backend messages report discoveries.
const FILLER_MESSAGES = [
  'Reading website content...',
  'Following internal links...',
  'Navigating to security pages...',
  'Parsing page content...',
  'Crawling linked pages...',
  'Loading compliance pages...',
  'Reading legal documentation...',
  'Extracting page metadata...',
  'Navigating trust portal...',
  'Fetching linked resources...',
  'Indexing page structure...',
  'Processing page content...',
  'Scanning linked documents...',
  'Loading referenced pages...',
  'Crawling subdomains...',
  'Reading footer links...',
  'Navigating to terms pages...',
  'Parsing document structure...',
  'Following redirect chains...',
  'Loading privacy pages...',
  'Reading page headers...',
  'Crawling documentation site...',
  'Fetching status pages...',
  'Scanning blog posts...',
  'Loading press releases...',
  'Navigating product pages...',
  'Reading about pages...',
  'Indexing site structure...',
  'Crawling knowledge base...',
  'Parsing changelog entries...',
  'Fetching API documentation...',
  'Scanning developer portal...',
  'Loading support pages...',
  'Reading partnership pages...',
  'Navigating careers section...',
];

const MAX_VISIBLE = 5;

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
  // Older messages fade out progressively
  const fadeOpacity = position <= 1 ? 1 : position === 2 ? 0.7 : position === 3 ? 0.4 : 0.2;

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-500 ease-out ${
        visible ? 'translate-x-0' : '-translate-x-4'
      } ${isFound ? 'bg-success/10' : ''} ${isError ? 'bg-destructive/10' : ''}`}
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
  const usedFillersRef = useRef(new Set<number>());

  useEffect(() => {
    const newMessages = realMessages.slice(lastRealCountRef.current);
    if (newMessages.length > 0) {
      queueRef.current.push(...newMessages);
      lastRealCountRef.current = realMessages.length;
    }
  }, [realMessages]);

  const drainOne = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift()!;
    setDisplayed((prev) => [...prev, next]);

    if (queueRef.current.length > 0) {
      drainTimerRef.current = setTimeout(drainOne, 600);
    } else {
      drainTimerRef.current = null;
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

  // Pick a random unused filler, or reset if all used
  const pickFiller = useCallback(() => {
    if (usedFillersRef.current.size >= FILLER_MESSAGES.length) {
      usedFillersRef.current.clear();
    }
    let idx: number;
    do {
      idx = Math.floor(Math.random() * FILLER_MESSAGES.length);
    } while (usedFillersRef.current.has(idx));
    usedFillersRef.current.add(idx);
    return FILLER_MESSAGES[idx]!;
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (fillerTimerRef.current) clearInterval(fillerTimerRef.current);
      return;
    }

    fillerTimerRef.current = setInterval(() => {
      if (queueRef.current.length === 0) {
        const text = pickFiller();
        setDisplayed((prev) => [
          ...prev,
          { text, type: 'searching' as MessageType, timestamp: Date.now() },
        ]);
      }
    }, 3500);

    return () => {
      if (fillerTimerRef.current) clearInterval(fillerTimerRef.current);
    };
  }, [isActive, pickFiller]);

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
  const displayedMessages = useDripFeed(messages, isActive);

  // Only show the last N messages, newest at bottom
  const visibleMessages = displayedMessages.slice(-MAX_VISIBLE);

  // Count findings from real messages (not fillers)
  const findings = useMemo(() => {
    let certs = 0;
    let links = 0;
    let assessment = false;
    let news = 0;
    for (const msg of displayedMessages) {
      if (msg.type !== 'found') continue;
      const t = msg.text.toLowerCase();
      if (t.includes('certification')) certs++;
      if (t.includes('link')) links++;
      if (t.includes('assessment')) assessment = true;
      if (t.includes('news')) {
        const match = msg.text.match(/(\d+)/);
        if (match) news = Number.parseInt(match[1]!, 10);
      }
    }
    return { certs, links, assessment, news };
  }, [displayedMessages]);

  const hasFindings = findings.certs > 0 || findings.links > 0 || findings.assessment || findings.news > 0;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-card to-card/80 shadow-lg overflow-hidden">
      {/* Header */}
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

      {/* Message feed — only last N messages, older ones fade */}
      <div className="px-4 pb-2">
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
          {isActive && displayedMessages.length > 0 && (
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

      {/* Findings counter */}
      {hasFindings && (
        <div className="px-5 py-3 border-t border-border/50 flex items-center gap-4">
          {findings.certs > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                <Checkmark size={10} className="text-success" />
              </span>
              <span className="text-xs text-muted-foreground">
                {findings.certs} {findings.certs === 1 ? 'certification' : 'certifications'}
              </span>
            </div>
          )}
          {findings.links > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                <Checkmark size={10} className="text-success" />
              </span>
              <span className="text-xs text-muted-foreground">
                {findings.links} {findings.links === 1 ? 'link' : 'links'}
              </span>
            </div>
          )}
          {findings.assessment && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                <Checkmark size={10} className="text-success" />
              </span>
              <span className="text-xs text-muted-foreground">assessment</span>
            </div>
          )}
          {findings.news > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                <Checkmark size={10} className="text-success" />
              </span>
              <span className="text-xs text-muted-foreground">
                {findings.news} news {findings.news === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
