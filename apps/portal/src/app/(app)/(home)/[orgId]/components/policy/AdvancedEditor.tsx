'use client';

import { Editor, type JSONContent } from '@comp/ui/editor';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({ initialContent }: AdvancedEditorProps) => {
  if (!initialContent) return null;

  return (
    <Editor
      initialContent={initialContent}
      readOnly={true}
      showSaveStatus={false}
      showWordCount={false}
      showToolbar={false}
      minHeight="320px"
      className="w-full"
    />
  );
};

export default AdvancedEditor;
