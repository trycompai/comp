'use client';

import { Card, CardContent, Text } from '@trycompai/design-system';
import { Checkmark, Search } from '@trycompai/design-system/icons';
import { AnimatedSizeContainer } from '@trycompai/ui/animated-size-container';
import { useEffect, useRef, useState } from 'react';

type MessageType = 'searching' | 'found' | 'analyzing' | 'error';

type ResearchMessage = {
  text: string;
  type: MessageType;
  timestamp: number;
};

interface VendorResearchFeedProps {
  messages: ResearchMessage[];
  isActive: boolean;
}

const MESSAGE_COLORS: Record<MessageType, string> = {
  searching: 'text-blue-400',
  found: 'text-green-400',
  analyzing: 'text-muted-foreground',
  error: 'text-red-400',
};

const MESSAGE_ICONS: Record<MessageType, React.ReactNode> = {
  searching: <Search size={12} className="text-blue-400 shrink-0" />,
  found: <Checkmark size={12} className="text-green-400 shrink-0" />,
  analyzing: (
    <span className="w-3 h-3 shrink-0 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
  ),
  error: <span className="text-red-400 shrink-0 text-xs">✗</span>,
};

function FeedMessage({ message }: { message: ResearchMessage }) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger fade-in on mount
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex items-start gap-2 py-1 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className="mt-0.5">{MESSAGE_ICONS[message.type]}</span>
      <span className={`text-xs font-mono ${MESSAGE_COLORS[message.type]}`}>
        {message.text}
      </span>
    </div>
  );
}

export function VendorResearchFeed({ messages, isActive }: VendorResearchFeedProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  return (
    <Card>
      <CardContent>
        <div className="py-4">
          <div className="flex items-center gap-2 mb-4">
            {isActive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
            <Text size="sm" weight="medium">
              {isActive ? 'Researching vendor security posture...' : 'Research complete'}
            </Text>
          </div>

          <AnimatedSizeContainer width={false}>
            <div className="max-h-64 overflow-y-auto">
              {messages.map((msg, i) => (
                <FeedMessage key={`${msg.timestamp}-${i}`} message={msg} />
              ))}
              <div ref={feedEndRef} />
            </div>
          </AnimatedSizeContainer>
        </div>
      </CardContent>
    </Card>
  );
}
