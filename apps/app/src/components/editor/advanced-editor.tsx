'use client';

import { Separator } from '@comp/ui/separator';
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  type JSONContent,
  handleCommandNavigation,
} from 'novel';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { NodeSelector } from './selectors/node-selector';

import type { Extensions } from '@tiptap/core';
import GenerativeMenuSwitch from './generative/generative-menu-switch';
import { TextButtons } from './selectors/text-buttons';
import { suggestionItems } from './slash-command';

const extensions: Extensions = [...defaultExtensions];

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = 'Start writing...',
  className,
  saveDebounceMs = 500,
}: AdvancedEditorProps) => {
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Unsaved'>('Saved');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);

  const debouncedSave = useDebouncedCallback(async (content: JSONContent) => {
    if (!onSave) return;

    setSaveStatus('Saving');

    try {
      await onSave(content);
      setSaveStatus('Saved');
    } catch (err) {
      console.error('Failed to save content:', err);
      setSaveStatus('Unsaved');
    }
  }, saveDebounceMs);

  if (!initialContent) return null;

  return (
    <div className="bg-background relative w-full p-4">
      <div className="absolute top-5 right-5 z-10 mb-5 flex gap-2">
        <div className="bg-accent text-muted-foreground px-2 py-1 text-sm">{saveStatus}</div>
        <div
          className={charsCount ? 'bg-accent text-muted-foreground px-2 py-1 text-sm' : 'hidden'}
        >
          {charsCount} Words
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={initialContent}
          extensions={extensions}
          className="bg-bakground relative max-h-[500px] min-h-[500px] w-full overflow-x-hidden overflow-y-auto p-2"
          editable={!readOnly}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class:
                'max-h-[500px] prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-hidden max-w-full',
            },
          }}
          onUpdate={({ editor }) => {
            if (readOnly) return;

            const content = editor.getJSON();
            setCharsCount(editor.storage.characterCount.words());

            if (onUpdate) {
              onUpdate(content);
            }

            if (initialLoadComplete && onSave) {
              setSaveStatus('Unsaved');
              debouncedSave(content);
            }
          }}
        >
          {!readOnly && (
            <>
              <EditorCommand className="border-muted bg-background z-50 h-auto max-h-[330px] overflow-y-auto border px-1 py-2 shadow-md transition-all">
                <EditorCommandEmpty className="text-muted-foreground px-2">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {suggestionItems.map((item: any) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command(val)}
                      className="hover:bg-accent aria-selected:bg-accent flex w-full items-center space-x-2 px-2 py-1 text-left text-sm"
                      key={item.title}
                    >
                      <div className="border-muted bg-background flex h-10 w-10 items-center justify-center border">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>

              <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                <Separator orientation="vertical" />
                <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                <Separator orientation="vertical" />

                <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                <Separator orientation="vertical" />
                <MathSelector />
                <Separator orientation="vertical" />
                <TextButtons />
                <Separator orientation="vertical" />
              </GenerativeMenuSwitch>
            </>
          )}
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default AdvancedEditor;
