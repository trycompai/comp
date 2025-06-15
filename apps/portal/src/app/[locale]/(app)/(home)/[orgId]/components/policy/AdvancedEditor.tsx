"use client";

import {
  EditorContent,
  EditorRoot,
  type JSONContent,
  handleCommandNavigation,
} from "novel";
import { defaultExtensions } from "./extensions";

interface AdvancedEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  saveDebounceMs?: number;
}

const AdvancedEditor = ({ initialContent }: AdvancedEditorProps) => {
  if (!initialContent) return null;

  // Ensure content is properly structured with a doc type
  const formattedContent = Array.isArray(initialContent)
    ? { type: "doc", content: initialContent }
    : initialContent.type === "doc"
      ? initialContent
      : { type: "doc", content: [initialContent] };

  // Ensure there's at least one paragraph with text content
  if (!formattedContent.content || formattedContent.content.length === 0) {
    formattedContent.content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "" }],
      },
    ];
  }

  return (
    <div className="relative w-full max-w-screen-lg">
      <EditorRoot>
        <EditorContent
          editable={false}
          immediatelyRender={false}
          initialContent={initialContent}
          extensions={defaultExtensions}
          className="bg-background relative min-h-[500px] w-full max-w-screen-lg p-2 sm:mb-[calc(20vh)]"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-hidden max-w-full",
            },
          }}
        />
      </EditorRoot>
    </div>
  );
};

export default AdvancedEditor;
