"use client";

import { cn } from "@bubba/ui/cn";
import {
  BubbleMenu,
  EditorContent,
  type JSONContent,
  useEditor,
} from "@tiptap/react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { useState, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  ListOrdered,
  ListTree,
  Underline,
  Strikethrough,
} from "lucide-react";
import { Button } from "@bubba/ui/button";
import "@bubba/ui/editor.css";
import { SaveStatus } from "./headers/status";

export interface RichTextEditorProps {
  initialContent?: JSONContent | JSONContent[];
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  autofocus?: boolean;
  saveDebounceMs?: number;
}

export function RichTextEditor({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = "Start writing...",
  className,
  autofocus = false,
  saveDebounceMs = 500,
}: RichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving" | "Unsaved">(
    "Saved",
  );
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const formattedInitialContent = useCallback(() => {
    if (!initialContent) return null;

    if (Array.isArray(initialContent)) {
      return {
        type: "doc",
        content: initialContent,
      };
    }

    if (
      initialContent.type === "doc" &&
      Array.isArray(initialContent.content)
    ) {
      return initialContent;
    }

    return initialContent;
  }, [initialContent]);

  const debouncedSave = useDebouncedCallback(async (content: JSONContent) => {
    if (!onSave) return;

    setSaveStatus("Saving");

    try {
      await onSave(content);
      setSaveStatus("Saved");
    } catch (err) {
      console.error("Failed to save content:", err);
      setSaveStatus("Unsaved");
    }
  }, saveDebounceMs);

  const editor = useEditor({
    extensions: defaultExtensions,
    content: formattedInitialContent(),
    editable: !readOnly,
    autofocus,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert focus:outline-none h-full w-full focus:outline-none text-foreground max-w-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getJSON();

      if (onUpdate) {
        onUpdate(content);
      }

      if (initialLoadComplete && onSave) {
        setSaveStatus("Unsaved");
        debouncedSave(content);
      }
    },
  });

  useEffect(() => {
    if (editor && initialContent && !initialLoadComplete) {
      try {
        const content = formattedInitialContent();

        if (content) {
          editor.commands.setContent(content);
        }

        setInitialLoadComplete(true);
      } catch (e) {
        console.error("Error setting editor content:", e);
      }
    }
  }, [editor, initialContent, initialLoadComplete, formattedInitialContent]);

  if (!editor) {
    return <div className="p-4 border animate-pulse">Loading editor...</div>;
  }

  return (
    <div className={cn("relative w-full", className)}>
      {editor && !readOnly && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            placement: "top",
            offset: [0, 10],
            zIndex: 99,
          }}
          shouldShow={({ editor, from, to }) => {
            return from !== to && !editor.isActive("codeBlock");
          }}
        >
          <div className="flex bg-background border border-border shadow-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "rounded-none",
                editor.isActive("bold") && "bg-accent",
              )}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "rounded-none",
                editor.isActive("italic") && "bg-accent",
              )}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "rounded-none",
                editor.isActive("underline") && "bg-accent",
              )}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                "rounded-none",
                editor.isActive("strike") && "bg-accent",
              )}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(
                "rounded-none",
                editor.isActive("bulletList") && "bg-accent",
              )}
            >
              <ListTree className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(
                "rounded-none",
                editor.isActive("orderedList") && "bg-accent",
              )}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
        </BubbleMenu>
      )}

      <SaveStatus saveStatus={saveStatus} />
      <EditorContent editor={editor} className="prose-sm max-w-none" />
    </div>
  );
}
