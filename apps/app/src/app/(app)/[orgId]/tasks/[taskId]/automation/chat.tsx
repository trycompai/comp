'use client';

import { Models } from '@/ai/constants';
import { Github, VercelIcon } from '@/components/ai/icons';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { Card, CardDescription, CardHeader } from '@comp/ui/card';
import { ArrowLeft, Cloud, Globe, MessageCircleIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './components/ai-elements/conversation';
import { Message } from './components/chat/message';
import type { ChatUIMessage } from './components/chat/types';
import { PanelHeader } from './components/panels/panels';
import { Input } from './components/ui/input';
import { useSharedChatContext } from './lib/chat-context';
import { useTaskAutomationStore } from './lib/task-automation-store';
import { useLocalStorageValue } from './lib/use-local-storage-value';

interface Props {
  className: string;
  modelId?: string;
  orgId: string;
  taskId: string;
}

type Category = 'recommended' | 'github' | 'website' | 'vercel' | 'cloudflare';
const AUTOMATION_CATEGORIES: Category[] = [
  'recommended',
  'github',
  'website',
  'vercel',
  'cloudflare',
];

interface Example {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  categories: Category[];
}

const AUTOMATION_EXAMPLES: Example[] = [
  {
    title: 'Check if I have dependabot enabled in my GitHub repository',
    prompt: 'Check if I have dependabot enabled in my GitHub repository',
    icon: <Github className="w-4 h-4" />,
    categories: ['recommended', 'github'],
  },
  {
    title: 'Check if I have branch protection enabled for the main branch in my GitHub repository',
    prompt: 'Check if I have branch protection enabled for the main branch in my GitHub repository',
    icon: <Github className="w-4 h-4" />,
    categories: ['recommended', 'github'],
  },
  {
    title: 'Check if my website has a privacy policy',
    prompt: 'Check if my website has a privacy policy',
    icon: <Globe className="w-4 h-4" />,
    categories: ['recommended', 'website'],
  },
  {
    title: 'Give me a list of failed deployments in my Vercel project',
    prompt: 'Give me a list of failed deployments in my Vercel project',
    icon: <VercelIcon size={16} />,
    categories: ['recommended', 'vercel'],
  },
  {
    title: 'Check that DDoS protection is enabled for my Cloudflare project',
    prompt: 'Check that DDoS protection is enabled for my Cloudflare project',
    icon: <Cloud size={16} />,
    categories: ['recommended', 'cloudflare'],
  },
];

export function Chat({ className, orgId, taskId }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input');
  const { chat } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat });
  const { setChatStatus } = useTaskAutomationStore();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleExampleClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      // Focus the input for immediate interaction
      inputRef.current?.focus();
    },
    [setInput],
  );

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage(
          { text },
          { body: { modelId: Models.OpenAIGPT5Mini, reasoningEffort: 'medium', orgId, taskId } },
        );
        setInput('');
      }
    },
    [sendMessage, setInput, orgId, taskId],
  );

  const handleSecretAdded = useCallback(
    (secretName: string) => {
      // Send a message to the AI informing it that the secret was added
      sendMessage(
        {
          text: `I've added the secret "${secretName}". You can now use it in the automation script.`,
        },
        { body: { modelId: Models.OpenAIGPT5Mini, reasoningEffort: 'medium', orgId, taskId } },
      );
    },
    [sendMessage, orgId, taskId],
  );

  const handleInfoProvided = useCallback(
    (info: Record<string, string>) => {
      // Format the provided information for the AI
      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Send a message to the AI with the provided information
      sendMessage(
        {
          text: `I've provided the following information:\n\n${infoText}\n\nYou can now continue with creating the automation script.`,
        },
        { body: { modelId: Models.OpenAIGPT5Mini, reasoningEffort: 'medium', orgId, taskId } },
      );
    },
    [sendMessage, orgId, taskId],
  );

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn(className, 'selection:bg-primary selection:text-white')}
      style={{ height: 'calc(100vh - 6em)' }}
    >
      <Image
        src="/automation-bg.svg"
        alt="Automation"
        width={538}
        height={561}
        className="absolute top-0 right-0 z-1"
      />
      <PanelHeader className="shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgId}/tasks/${taskId}`}
            className="p-1 -ml-1 rounded hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Link>
          <div className="relative">
            <div className="absolute inset-0 blur-md rounded-full" />
            <MessageCircleIcon className="relative w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm tracking-wide text-foreground/90">Chat</span>
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {!hasMessages ? (
        <form
          className="flex flex-col w-full h-full px-58"
          onSubmit={async (event) => {
            event.preventDefault();
            validateAndSubmitMessage(input);
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto h-full">
            <div className="w-full h-full flex flex-col items-center py-48">
              {/* Top Section - Fixed Position */}
              <div className="w-full max-w-3xl text-center space-y-8 mb-80">
                <p className="text-2xl font-medium text-primary tracking-wide">
                  What do you want to automate today?
                </p>
                <Input
                  ref={inputRef}
                  placeholder="Check if GitHub dependabot is enabled and tell me the result"
                  className="w-full max-w-3xl transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:scale-[1.01] focus:shadow-lg focus:shadow-primary/10 focus:scale-[1.02] focus:ring-2 focus:ring-primary/30"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={status === 'streaming' || status === 'submitted'}
                />
              </div>

              {/* Examples Section */}
              <div className="w-full max-w-4xl space-y-8">
                <h3 className="text-xl font-normal text-center text-primary">
                  Get started with examples
                </h3>

                {/* All Examples Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AUTOMATION_EXAMPLES.map((example) => (
                    <Card
                      key={example.title}
                      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                      onClick={() => handleExampleClick(example.prompt)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="border p-1.5 bg-background w-fit rounded-sm flex-shrink-0">
                            {example.icon}
                          </span>
                          <CardDescription className="flex-1">
                            <p className="text-sm font-normal text-foreground leading-relaxed">
                              {example.title}
                            </p>
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-col h-full">
          <Conversation className="flex-1 min-h-0 z-10">
            <ConversationContent className="space-y-4 z-10">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  orgId={orgId}
                  onSecretAdded={handleSecretAdded}
                  onInfoProvided={handleInfoProvided}
                />
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <form
            className="flex py-6 px-4"
            onSubmit={async (event) => {
              event.preventDefault();
              validateAndSubmitMessage(input);
            }}
          >
            <Input
              disabled={status === 'streaming' || status === 'submitted'}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to create an automation..."
              value={input}
            />
          </form>
        </div>
      )}
    </div>
  );
}
