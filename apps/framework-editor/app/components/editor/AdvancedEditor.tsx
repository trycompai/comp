'use client';

import { Editor, type JSONContent } from '@comp/ui/editor';

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
  if (!initialContent) {
    console.warn('AdvancedEditor: initialContent is missing.');
    return null;
  }

  return (
    <Editor
      initialContent={initialContent}
      onSave={onSave}
      readOnly={readOnly}
      saveDebounceMs={saveDebounceMs}
      showSaveStatus={true}
      showWordCount={true}
      showToolbar={true}
      minHeight="300px"
    />
  );
};

export default AdvancedEditor;
