'use client';

import type { JSONContent } from '@tiptap/react';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  saveDebounceMs?: number;
}

const getPlainText = (node: JSONContent): string => {
  if (!node) return '';

  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (Array.isArray(node.content)) {
    return node.content.map((child) => getPlainText(child)).join('');
  }

  return '';
};

const AdvancedEditor = ({ initialContent }: AdvancedEditorProps) => {
  if (!initialContent) return null;

  const doc: JSONContent = Array.isArray(initialContent)
    ? { type: 'doc', content: initialContent }
    : initialContent;

  const blocks = Array.isArray(doc.content) ? doc.content : [];

  return (
    <div className="mx-auto max-w-screen-lg sm:mb-[calc(20vh)]">
      <div className="space-y-3 text-sm leading-6">
        {blocks.map((block, index) => {
          const text = getPlainText(block).trim();
          if (!text) return null;
          return (
            <p key={index} className="whitespace-pre-wrap">
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default AdvancedEditor;
