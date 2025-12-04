'use client';

import { validateAndFixTipTapContent } from '@comp/ui/editor';
import type { JSONContent } from '@tiptap/react';
import AdvancedEditor from './advanced-editor';

interface PolicyEditorProps {
  content: JSONContent[];
  readOnly?: boolean;
  onSave?: (content: JSONContent[]) => Promise<void>;
}

export function PolicyEditor({ content, readOnly = false, onSave }: PolicyEditorProps) {
  const documentContent = validateAndFixTipTapContent({
    type: 'doc',
    content: Array.isArray(content) && content.length > 0 ? content : [],
  });

  const handleSave = async (contentToSave: JSONContent): Promise<void> => {
    if (!contentToSave || !onSave) return;

    try {
      const fixed = validateAndFixTipTapContent(contentToSave);
      const contentArray = (fixed.content || []) as JSONContent[];
      await onSave(contentArray);
    } catch (error) {
      console.error('Error saving policy:', error);
      throw error;
    }
  };

  return (
    <>
      <AdvancedEditor initialContent={documentContent} onSave={handleSave} readOnly={readOnly} />
    </>
  );
}
