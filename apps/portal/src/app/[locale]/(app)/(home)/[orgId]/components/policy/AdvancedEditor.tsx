'use client';

import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { defaultExtensions } from './extensions';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({ initialContent }: AdvancedEditorProps) => {
  // Ensure content is properly structured with a doc type
  const formattedContent = initialContent
    ? Array.isArray(initialContent)
      ? { type: 'doc', content: initialContent }
      : initialContent.type === 'doc'
        ? initialContent
        : { type: 'doc', content: [initialContent] }
    : null;

  // Ensure there's at least one paragraph with text content
  if (formattedContent && (!formattedContent.content || formattedContent.content.length === 0)) {
    formattedContent.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '' }],
      },
    ];
  }

  const editor = useEditor({
    extensions: defaultExtensions,
    content: formattedContent || '',
    editable: false,
    immediatelyRender: false,
  });

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <EditorContent
        editor={editor}
        className="bg-background relative min-h-[500px] w-full max-w-screen-lg p-2 sm:mb-[calc(20vh)] prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-hidden max-w-full"
      />
    </div>
  );
};

export default AdvancedEditor;
