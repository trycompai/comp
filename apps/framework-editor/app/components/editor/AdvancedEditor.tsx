'use client';

import { Separator } from '@comp/ui/separator';
import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';

// Import the selector components
import { LinkSelector } from './selectors/LinkSelector';
import { NodeSelector } from './selectors/NodeSelector';
import { TextButtons } from './selectors/TextButtons';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({
  initialContent,
  onSave,
  readOnly = false,
  saveDebounceMs = 1000,
}: AdvancedEditorProps) => {
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Unsaved'>('Saved');
  const [charsCount, setCharsCount] = useState<number>(0);

  // State for popovers
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [isLinkSelectorOpen, setIsLinkSelectorOpen] = useState(false);

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

  const editor = useEditor({
    extensions: defaultExtensions,
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getJSON();
      const wordCount = editor.storage.characterCount?.words() ?? 0;
      setCharsCount(wordCount);

      if (onSave) {
        setSaveStatus('Unsaved');
        debouncedSave(content);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const wordCount = editor.storage.characterCount?.words() ?? 0;
      setCharsCount(wordCount);
    },
  });

  useEffect(() => {
    if (editor) {
      const wordCount = editor.storage.characterCount?.words() ?? 0;
      setCharsCount(wordCount);
    }
  }, [editor]);

  if (!initialContent) {
    console.warn('AdvancedEditor: initialContent is missing.');
    return null;
  }

  return (
    <div className="bg-background relative flex w-full flex-col gap-2 rounded-sm border">
      {/* Toolbar Area */}
      {!readOnly && editor && (
        <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-2">
          <NodeSelector
            editor={editor}
            isOpen={isNodeSelectorOpen}
            onOpenChange={setIsNodeSelectorOpen}
          />
          <Separator orientation="vertical" className="h-6" />
          <LinkSelector
            editor={editor}
            isOpen={isLinkSelectorOpen}
            onOpenChange={setIsLinkSelectorOpen}
          />
          <Separator orientation="vertical" className="h-6" />
          <TextButtons editor={editor} />
          <div className="ml-auto flex items-center gap-2">
            <div className="bg-accent text-muted-foreground rounded-sm px-2 py-1 text-sm">
              {saveStatus}
            </div>
            <div className="bg-accent text-muted-foreground rounded-sm px-2 py-1 text-sm">
              {charsCount} Words
            </div>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="bg-background prose prose-sm sm:prose-base dark:prose-invert relative min-h-[300px] w-full max-w-full overflow-y-auto p-4 focus:outline-hidden"
      />
    </div>
  );
};

export default AdvancedEditor;
