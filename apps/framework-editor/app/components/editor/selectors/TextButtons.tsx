"use client";

import { type Editor } from "@tiptap/core";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";
import { Toggle } from "@comp/ui/toggle";

interface TextButtonsProps {
  editor: Editor | null;
}

export function TextButtons({ editor }: TextButtonsProps) {
  const buttons = [
    {
      name: "Bold",
      command: () => editor?.chain().focus().toggleBold().run(),
      isActive: editor?.isActive("bold") ?? false,
      icon: <Bold className="h-4 w-4" />,
    },
    {
      name: "Italic",
      command: () => editor?.chain().focus().toggleItalic().run(),
      isActive: editor?.isActive("italic") ?? false,
      icon: <Italic className="h-4 w-4" />,
    },
    {
      name: "Strike",
      command: () => editor?.chain().focus().toggleStrike().run(),
      isActive: editor?.isActive("strike") ?? false,
      icon: <Strikethrough className="h-4 w-4" />,
    },
    {
      name: "Code",
      command: () => editor?.chain().focus().toggleCode().run(),
      isActive: editor?.isActive("code") ?? false,
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {buttons.map((button) => (
        <Toggle
          key={button.name}
          size="sm"
          pressed={button.isActive}
          onPressedChange={button.command}
          disabled={!editor}
          aria-label={button.name}
        >
          {button.icon}
        </Toggle>
      ))}
    </div>
  );
}
