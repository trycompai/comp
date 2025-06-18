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

  // Ensure content is properly structured with a doc type
  const formattedContent = initialContent
    ? Array.isArray(initialContent)
      ? { type: 'doc', content: initialContent }
      : initialContent.type === 'doc'
        ? initialContent
        : { type: 'doc', content: [initialContent] }
    : null;

  const editor = useEditor({
    extensions: defaultExtensions(placeholder),
    content: formattedContent || '',
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-hidden max-w-full ${className || ''}`,
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
      <div className="relative">
        {showToolbar && !readOnly && editor && (
          <div className="mb-4 border-muted rounded-sm bg-background flex items-center gap-1 p-2 border relative">
            <NodeSelector open={openNode} onOpenChange={setOpenNode} editor={editor} />
            <Separator orientation="vertical" className="h-6" />
            <TextButtons editor={editor} />
            <Separator orientation="vertical" className="h-6" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} editor={editor} />

            {(showSaveStatus || showWordCount) && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                {showSaveStatus && (
                  <div className="bg-accent text-muted-foreground px-3 py-1 text-sm rounded-sm leading-6">
                    {saveStatus}
                  </div>
                )}
                {showWordCount && charsCount > 0 && (
                  <div className="bg-accent text-muted-foreground px-3 py-1 text-sm rounded-sm leading-6">
                    {charsCount} Words
                  </div>
                )}
              </div>
            )}
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
