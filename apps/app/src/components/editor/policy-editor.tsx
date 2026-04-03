'use client';

import { validateAndFixTipTapContent } from '@trycompai/ui/editor';
import type { Extension } from '@tiptap/core';
import type { JSONContent, Editor as TipTapEditor } from '@tiptap/react';
import AdvancedEditor from './advanced-editor';

interface PolicyEditorProps {
  content: JSONContent[];
  readOnly?: boolean;
  onSave?: (content: JSONContent[]) => Promise<void>;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  additionalExtensions?: Extension[];
  onEditorReady?: (editor: TipTapEditor) => void;
  showToolbar?: boolean;
}

export function PolicyEditor({
  content,
  readOnly = false,
  onSave,
  className,
  minHeight,
  maxHeight,
  additionalExtensions,
  onEditorReady,
  showToolbar,
}: PolicyEditorProps) {
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
      <AdvancedEditor
        initialContent={documentContent}
        onSave={handleSave}
        readOnly={readOnly}
        className={className}
        minHeight={minHeight}
        maxHeight={maxHeight}
        additionalExtensions={additionalExtensions}
        onEditorReady={onEditorReady}
        showToolbar={showToolbar}
      />
    </>
  );
}
