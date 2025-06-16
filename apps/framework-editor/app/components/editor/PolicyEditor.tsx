"use client";

import type { JSONContent } from "@tiptap/react"; // Or from 'novel'
import { useState, useEffect, useMemo } from "react";
import AdvancedEditor from "./AdvancedEditor"; // Use local AdvancedEditor

interface PolicyEditorProps {
  // Accept raw JSONContent or array from DB
  initialDbContent: JSONContent | JSONContent[] | null | undefined;
  readOnly?: boolean;
  onSave?: (content: JSONContent) => Promise<void>; // AdvancedEditor expects single JSON object
}

export function PolicyEditor({
  initialDbContent,
  readOnly = false,
  onSave,
}: PolicyEditorProps) {
  // AdvancedEditor expects a single Tiptap document (JSONContent)
  // Convert the DB format (potentially null, array, or object) to the expected format.
  const initialEditorContent = useMemo(() => {
    if (!initialDbContent) {
      return { type: "doc", content: [] }; // Default empty doc
    }
    if (Array.isArray(initialDbContent)) {
      // If DB stores array, wrap it in a doc node
      return { type: "doc", content: initialDbContent };
    }
    if (typeof initialDbContent === "object" && initialDbContent !== null) {
      // If DB stores a valid JSON object, use it directly
      // Add basic validation if needed
      if (initialDbContent.type === "doc") {
        return initialDbContent as JSONContent;
      }
    }
    // Fallback for unexpected formats
    console.warn(
      "Unexpected initialDbContent format, using default empty doc.",
      initialDbContent,
    );
    return { type: "doc", content: [] };
  }, [initialDbContent]);

  // No internal state needed for content, pass directly to AdvancedEditor

  const handleSave = async (editorJsonContent: JSONContent): Promise<void> => {
    if (!onSave) return;

    try {
      // The server action expects the JSONContent as is (or handles array format)
      await onSave(editorJsonContent);
    } catch (error) {
      console.error("Error saving policy via PolicyEditor:", error);
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
