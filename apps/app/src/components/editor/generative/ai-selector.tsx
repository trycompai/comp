'use client';

import { Command, CommandInput } from '@comp/ui/command';

import { useCompletion } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import { ScrollArea } from '@comp/ui/scroll-area';
import { ArrowUp } from 'lucide-react';
import { addAIHighlight, useEditor } from 'novel';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import CrazySpinner from '../icons/crazy-spinner';
import Magic from '../icons/magic';
import AICompletionCommands from './ai-completion-command';
import AISelectorCommands from './ai-selector-commands';

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState('');

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/generate',
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error('You have reached your request limit for the day.');
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose prose-sm text-foreground p-2 px-4">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="text-muted-foreground flex h-12 w-full items-center px-4 text-sm font-medium">
          <Magic className="mr-2 h-4 w-4 shrink-0" />
          AI is thinking
          <div className="mt-1 ml-2">
            <CrazySpinner />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={
                hasCompletion ? 'Tell AI what to do next' : 'Ask AI to edit or generate...'
              }
              onFocus={() => {
                if (editor) addAIHighlight(editor);
              }}
            />
            <Button
              size="icon"
              variant="outline"
              className="absolute top-1/2 right-2 h-6 w-6"
              onClick={() => {
                if (completion)
                  return complete(completion, {
                    body: {
                      option: 'zap',
                      command: inputValue,
                    },
                  }).then(() => setInputValue(''));

                const slice = editor?.state.selection.content();
                const text = editor?.storage.markdown.serializer.serialize(slice?.content);

                complete(text, {
                  body: {
                    option: 'zap',
                    command: inputValue,
                  },
                }).then(() => setInputValue(''));
              }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                if (editor) editor.chain().unsetAIHighlight().focus().run();
                onOpenChange(false);
              }}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) => complete(value, { body: { option } })}
            />
          )}
        </>
      )}
    </Command>
  );
}
