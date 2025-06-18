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
      minHeight="500px"
      className="max-w-screen-lg mx-auto sm:mb-[calc(20vh)]"
    />
  );
};

export default AdvancedEditor;
