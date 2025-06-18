'use client';

import { Separator } from '@comp/ui/separator';
import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';
import { LinkSelector } from './selectors/link-selector';
import { NodeSelector } from './selectors/node-selector';
import { TextButtons } from './selectors/text-buttons';

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
    extensions: defaultExtensions,
    content: formattedContent || '',
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'max-h-[500px] prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-hidden max-w-full',
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
      <div className="relative">
        {!readOnly && editor && (
          <div className="mb-4 border-muted rounded-md bg-background flex items-center gap-1 p-2 border rounded-xs">
            <NodeSelector open={openNode} onOpenChange={setOpenNode} editor={editor} />
            <Separator orientation="vertical" className="h-6" />
            <TextButtons editor={editor} />
            <Separator orientation="vertical" className="h-6" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} editor={editor} />
          </div>
        )}
        <EditorContent
          editor={editor}
          className="bg-background relative max-h-[500px] min-h-[500px] w-full overflow-x-hidden overflow-y-auto p-2"
        />
      </div>
    </div>
  );
};

export default AdvancedEditor;
