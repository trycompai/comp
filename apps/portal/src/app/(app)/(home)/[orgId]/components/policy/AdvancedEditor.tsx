"use client";

import type { JSONContent } from "@trycompai/ui/editor";
import { Editor } from "@trycompai/ui/editor";

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
      className="mx-auto max-w-screen-lg sm:mb-[calc(20vh)]"
    />
  );
};

export default AdvancedEditor;
