'use client';

import type { JSONContent } from '@tiptap/react';
import { useState } from 'react';
import AdvancedEditor from './AdvancedEditor';

interface PolicyEditorProps {
  content: JSONContent[];
  onSave?: (content: JSONContent[]) => Promise<void>;
}

export function PolicyEditor({ content, onSave }: PolicyEditorProps) {
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);

  const documentContent = {
    type: 'doc',
    content:
      Array.isArray(content) && content.length > 0
        ? content
        : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };

  const handleUpdate = (updatedContent: JSONContent) => {
    setEditorContent(updatedContent);
  };

  const handleSave = async (contentToSave: JSONContent): Promise<void> => {
    if (!contentToSave || !onSave) return;

    try {
      const contentArray = contentToSave.content as JSONContent[];
      await onSave(contentArray);
    } catch (error) {
      console.error('Error saving policy:', error);
      throw error;
    }
  };

  return (
    <AdvancedEditor initialContent={documentContent} onUpdate={handleUpdate} onSave={handleSave} />
  );
}
