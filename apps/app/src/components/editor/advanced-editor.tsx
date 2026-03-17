'use client';

import '@/styles/editor.css';
import type { Extension } from '@tiptap/core';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { Editor, type JSONContent } from '@trycompai/ui/editor';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  saveDebounceMs?: number;
  minHeight?: string;
  maxHeight?: string;
  additionalExtensions?: Extension[];
  onEditorReady?: (editor: TipTapEditor) => void;
  showToolbar?: boolean;
}

const AdvancedEditor = ({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = 'Start writing...',
  className,
  saveDebounceMs = 500,
  minHeight,
  maxHeight,
  additionalExtensions,
  onEditorReady,
  showToolbar,
}: AdvancedEditorProps) => {
  return (
    <Editor
      initialContent={initialContent}
      onUpdate={onUpdate}
      onSave={onSave}
      readOnly={readOnly}
      placeholder={placeholder}
      className={className}
      saveDebounceMs={saveDebounceMs}
      showSaveStatus={true}
      showWordCount={true}
      showToolbar={showToolbar}
      minHeight={minHeight}
      maxHeight={maxHeight}
      additionalExtensions={additionalExtensions}
      onEditorReady={onEditorReady}
    />
  );
};

export default AdvancedEditor;
