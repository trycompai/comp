'use client';

import {
  AIChatBody,
  Badge,
  Button,
  Card,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import {
  ArrowDown,
  CheckmarkFilled,
  CircleFilled,
  Close,
  Error,
  Time,
} from '@trycompai/design-system/icons';
import type { ChatStatus } from 'ai';
import { useState } from 'react';
import type { PolicyChatUIMessage } from '../../types';

interface PolicyAiAssistantProps {
  messages: PolicyChatUIMessage[];
  status: ChatStatus;
  errorMessage?: string | null;
  sendMessage: (payload: { text: string }) => void;
  close?: () => void;
  hasActiveProposal?: boolean;
}

export function PolicyAiAssistant({
  messages,
  status,
  errorMessage,
  sendMessage,
  close,
  hasActiveProposal,
}: PolicyAiAssistantProps) {
  const [input, setInput] = useState('');

  const isLoading = status === 'streaming' || status === 'submitted';

  const hasActiveTool = messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.parts.some(
        (p) =>
          p.type === 'tool-proposePolicy' &&
          (p.state === 'input-streaming' ||
            p.state === 'output-available' ||
            p.state === 'output-error'),
      ),
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card
      width="full"
      title="AI Assistant"
      headerAction={
        close && (
          <Button variant="ghost" size="icon-sm" onClick={close}>
            <Close size={16} />
          </Button>
        )
      }
    >
      <Stack gap="md">
        <AIChatBody>
          <Stack gap="sm">
            {messages.length === 0 ? (
              <Stack gap="sm">
                <Text size="sm" variant="muted">
                  I can help you edit, adapt, or check this policy for compliance. Try asking me
                  things like:
                </Text>
                <Stack gap="xs">
                  <Text size="xs" variant="muted">
                    "Adapt this for a fully remote, distributed team."
                  </Text>
                  <Text size="xs" variant="muted">
                    "Can I shorten the data retention timeframe and still meet SOC 2 standards?"
                  </Text>
                  <Text size="xs" variant="muted">
                    "Modify the access control section to include contractors."
                  </Text>
                </Stack>
              </Stack>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  hasActiveProposal={hasActiveProposal}
                />
              ))
            )}
            {isLoading && !hasActiveTool && (
              <Text size="sm" variant="muted">
                Thinking...
              </Text>
            )}
          </Stack>
        </AIChatBody>

        {errorMessage && (
          <Stack>
            <Text size="xs" variant="destructive">
              {errorMessage}
            </Text>
          </Stack>
        )}

        <Stack gap="xs">
          <Textarea
            size="full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this policy..."
            rows={2}
          />
          <HStack justify="end">
            <Button size="sm" onClick={handleSubmit} disabled={isLoading || !input.trim()}>
              Send
            </Button>
          </HStack>
        </Stack>
      </Stack>
    </Card>
  );
}

function MessageBubble({
  message,
  hasActiveProposal,
}: {
  message: PolicyChatUIMessage;
  hasActiveProposal?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={
        isUser ? 'ml-auto max-w-[85%] rounded-lg bg-secondary px-3 py-2' : 'text-foreground'
      }
    >
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={`${message.id}-${index}`} className="whitespace-pre-wrap text-sm">
              {part.text}
            </div>
          );
        }

        if (part.type === 'tool-proposePolicy') {
          return (
            <ToolCard
              key={`${message.id}-${index}`}
              part={part}
              hasActiveProposal={hasActiveProposal}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

function ToolCard({
  part,
  hasActiveProposal,
}: {
  part: {
    type: 'tool-proposePolicy';
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
    input?: {
      title?: string;
      summary?: string;
      detail?: string;
      content?: string;
    };
  };
  hasActiveProposal?: boolean;
}) {
  const toolInput = part.input;

  const isInProgress = part.state === 'input-streaming' || part.state === 'input-available';
  const isCompleted = part.state === 'output-available';

  const title =
    (isCompleted
      ? toolInput?.title || toolInput?.summary
      : toolInput?.title || 'Configuring policy updates') || 'Policy updates ready for your review';

  const bodyText = (() => {
    if (isInProgress) {
      return (
        toolInput?.detail ||
        'I am preparing an updated version of this policy. Please wait a moment before accepting any changes.'
      );
    }
    if (isCompleted) {
      return (
        toolInput?.detail ||
        'The updated policy is ready. Review the diff in the editor before applying changes.'
      );
    }
    return (
      toolInput?.detail ||
      'Review the proposed changes in the editor preview below before applying them.'
    );
  })();

  const truncatedBodyText = bodyText.length > 180 ? `${bodyText.slice(0, 177)}…` : bodyText;

  type ToolState = typeof part.state;
  const statusConfig: Record<ToolState, { label: string; icon: React.ReactNode }> = {
    'input-streaming': { label: 'Drafting', icon: <CircleFilled size={12} /> },
    'input-available': {
      label: 'Running',
      icon: <Time size={12} className="animate-pulse" />,
    },
    'output-available': {
      label: 'Completed',
      icon: <CheckmarkFilled size={12} className="text-green-600" />,
    },
    'output-error': { label: 'Error', icon: <Error size={12} className="text-red-600" /> },
  };

  const { label, icon } = statusConfig[part.state];

  return (
    <Card
      title={title}
      headerAction={
        <Badge variant="secondary">
          <HStack gap="xs" align="center">
            {icon}
            <span className="text-[10px] uppercase tracking-wider">{label}</span>
          </HStack>
        </Badge>
      }
    >
      <Stack gap="sm">
        <Text size="xs" variant="muted">
          {truncatedBodyText}
        </Text>
        {hasActiveProposal && isCompleted && (
          <HStack gap="xs" align="center">
            <ArrowDown size={12} className="text-primary" />
            <Text size="xs" variant="primary">
              View proposed changes below
            </Text>
          </HStack>
        )}
      </Stack>
    </Card>
  );
}
