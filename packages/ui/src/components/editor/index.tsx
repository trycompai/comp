'use client';

import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Separator } from '../separator';
import { defaultExtensions } from './extensions';
import { LinkSelector } from './selectors/link-selector';
import { NodeSelector } from './selectors/node-selector';
import { TextButtons } from './selectors/text-buttons';
import { linkifyContent } from './utils/linkify-content';
import { validateAndFixTipTapContent } from './utils/validate-content';

export interface EditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  saveDebounceMs?: number;
  showSaveStatus?: boolean;
  showWordCount?: boolean;
  showToolbar?: boolean;
  minHeight?: string;
  maxHeight?: string;
}

export const Editor = ({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = 'Start writing...',
  className,
  saveDebounceMs = 500,
  showSaveStatus = true,
  showWordCount = true,
  showToolbar = true,
  minHeight = '500px',
  maxHeight = '500px',
}: EditorProps) => {
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Unsaved'>('Saved');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [charsCount, setCharsCount] = useState<number>(0);
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  // Ensure content is properly structured and add link marks for plain URLs in read-only mode
  const validated = initialContent ? validateAndFixTipTapContent(initialContent) : null;
  const formattedContent = readOnly && validated ? linkifyContent(validated) : validated;

  const editor = useEditor({
    extensions: defaultExtensions({ placeholder, openLinksOnClick: readOnly }),
    content: formattedContent || '',
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-lg  prose-headings:font-title font-default focus:outline-hidden max-w-full ${className || ''}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (readOnly) return;

      const content = editor.getJSON();
      const characterCount = editor.storage.characterCount;
      if (characterCount) {
        setCharsCount(characterCount.words());
      }

      if (onUpdate) {
        onUpdate(content);
      }

      if (initialLoadComplete && onSave) {
        setSaveStatus('Unsaved');
        debouncedSave(content);
      }
    },
  });

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

  if (!initialContent && !editor) return null;

  return (
    <div className="bg-background relative w-full p-4">
      <div className="relative flex flex-col gap-4">
        {showToolbar && !readOnly && editor && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <div className="flex w-full items-center gap-2 overflow-x-auto overflow-y-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <NodeSelector open={openNode} onOpenChange={setOpenNode} editor={editor} />
                <Separator orientation="vertical" className="h-6 shrink-0" />
                <TextButtons editor={editor} />
                <Separator orientation="vertical" className="h-6 shrink-0" />
                <LinkSelector open={openLink} onOpenChange={setOpenLink} editor={editor} />
              </div>

              {(showSaveStatus || showWordCount) && (
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {showSaveStatus && (
                    <div className="rounded-sm bg-accent px-3 py-1 text-sm leading-6 text-muted-foreground">
                      {saveStatus}
                    </div>
                  )}
                  {showWordCount && charsCount > 0 && (
                    <div className="rounded-sm bg-accent px-3 py-1 text-sm leading-6 text-muted-foreground">
                      {charsCount} Words
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <EditorContent
          editor={editor}
          className="bg-background relative w-full overflow-x-hidden overflow-y-auto p-2"
          style={{ minHeight, maxHeight }}
        />
      </div>
    </div>
  );
};

// Export types and utilities
export { useEditor } from '@tiptap/react';
export type { JSONContent } from '@tiptap/react';
export {
  debugTipTapContent,
  isValidTipTapContent,
  validateAndFixTipTapContent,
} from './utils/validate-content';
