'use client';

import type { JSONContent } from '@tiptap/react';
import { useMemo } from 'react';
import AdvancedEditor from './AdvancedEditor'; // Use local AdvancedEditor
import { validateAndFixTipTapContent } from '@trycompai/ui';

interface PolicyEditorProps {
  // Accept raw JSONContent or array from DB
  initialDbContent: JSONContent | JSONContent[] | null | undefined;
  readOnly?: boolean;
  onSave?: (content: JSONContent) => Promise<void>; // AdvancedEditor expects single JSON object
}

export function PolicyEditor({ initialDbContent, readOnly = false, onSave }: PolicyEditorProps) {
  // Use the shared validation function for consistent content handling
  // across all editors (handles stringified JSON, invalid lists, etc.)
  const initialEditorContent = useMemo(
    () => validateAndFixTipTapContent(initialDbContent),
    [initialDbContent],
  );

  // No internal state needed for content, pass directly to AdvancedEditor

  const handleSave = async (editorJsonContent: JSONContent): Promise<void> => {
    if (!onSave) return;

    try {
      // The server action expects the JSONContent as is (or handles array format)
      await onSave(editorJsonContent);
    } catch (error) {
      console.error('Error saving policy via PolicyEditor:', error);
      // Re-throw or handle error appropriately (e.g., show toast)
      throw error;
    }
  };

  return (
    <>
      <AdvancedEditor
        initialContent={initialEditorContent}
        // onUpdate is not needed here unless parent needs live updates
        onSave={handleSave}
        readOnly={readOnly}
      />
    </>
  );
}
