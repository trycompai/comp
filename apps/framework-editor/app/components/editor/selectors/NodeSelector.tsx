"use client";

import { type Editor } from "@tiptap/core";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@comp/ui/popover";
import { Button } from "@comp/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@comp/ui/command";
import { useState } from "react";

interface NodeSelectorProps {
  editor: Editor | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Simplified node types - Add more as needed (List, Quote, etc.)
const nodeTypes = [
  {
    name: "Paragraph",
    command: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor: Editor) => editor.isActive("paragraph"),
  },
  {
    name: "Heading 1",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor: Editor) => editor.isActive("heading", { level: 1 }),
  },
  {
    name: "Heading 2",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor: Editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    name: "Heading 3",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor: Editor) => editor.isActive("heading", { level: 3 }),
  },
  {
    name: "Bullet List",
    command: (editor: Editor) =>
      editor.chain().focus().toggleBulletList().run(),
    isActive: (editor: Editor) => editor.isActive("bulletList"),
  },
  {
    name: "Numbered List",
    command: (editor: Editor) =>
      editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor: Editor) => editor.isActive("orderedList"),
  },
  {
    name: "Quote",
    command: (editor: Editor) =>
      editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor: Editor) => editor.isActive("blockquote"),
  },
  {
    name: "Code Block",
    command: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor: Editor) => editor.isActive("codeBlock"),
  },
];

export function NodeSelector({
  editor,
  isOpen,
  onOpenChange,
}: NodeSelectorProps) {
  // Handle null editor case for activeType gracefully
  const activeType = editor
    ? nodeTypes.find((type) => type.isActive(editor))?.name || "Paragraph"
    : "Paragraph";

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={!editor}>
        <Button variant="ghost" size="sm" className="w-[100px] justify-start">
          {activeType}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {nodeTypes.map((type) => (
                <CommandItem
                  key={type.name}
                  onSelect={() => {
                    if (editor) {
                      type.command(editor);
                      onOpenChange(false);
                    }
                  }}
                  className="flex items-center justify-between px-2 py-1 text-sm"
                >
                  <span>{type.name}</span>
                  {activeType === type.name && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
