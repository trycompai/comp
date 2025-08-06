'use client';

import { Editor, type JSONContent } from '@comp/ui/editor';
import { useGT } from 'gt-next';

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = 'Start writing...',
  className,
  saveDebounceMs = 500,
}: AdvancedEditorProps) => {
  const t = useGT();
  const translatedPlaceholder =
    placeholder === 'Start writing...' ? t('Start writing...') : placeholder;
  return (
    <Editor
      initialContent={initialContent}
      onUpdate={onUpdate}
      onSave={onSave}
      readOnly={readOnly}
      placeholder={translatedPlaceholder}
      className={className}
      saveDebounceMs={saveDebounceMs}
      showSaveStatus={true}
      showWordCount={true}
      showToolbar={true}
    />
  );
};

export default AdvancedEditor;
