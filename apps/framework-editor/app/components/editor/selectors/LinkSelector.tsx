'use client';

import { type Editor } from '@tiptap/core';
import { Check, Trash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { useCallback, useEffect, useRef } from 'react';

interface LinkSelectorProps {
  editor: Editor | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LinkSelector({ editor, isOpen, onOpenChange }: LinkSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSetLink = useCallback(() => {
    if (!editor || !inputRef.current) return;
    const url = inputRef.current.value;

    // Unset link if URL is empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onOpenChange(false);
      return;
    }

    // Ensure URL starts with http:// or https://
    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      finalUrl = `https://${url}`;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    onOpenChange(false);
  }, [editor, onOpenChange]);

  // Autofocus the input when the popover opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Pre-fill with existing link if any
      if (editor?.isActive('link')) {
        const existingUrl = editor.getAttributes('link').href;
        if (inputRef.current) {
          inputRef.current.value = existingUrl;
        }
      }
    }
  }, [isOpen, editor]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={!editor}>
        {/* This button would typically be part of a bubble menu */}
        {/* For now, it's standalone */}
        <Button variant="ghost" size="sm" className="px-2">
          Link
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="w-60 p-2">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="url"
            placeholder="Paste a link..."
            className="bg-background flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSetLink();
              }
            }}
          />
          <Button size="icon" variant="outline" onClick={handleSetLink}>
            <Check className="h-4 w-4" />
          </Button>
          {/* Add an remove button if needed */}
          {/* <Button size="icon" variant="destructive" onClick={() => editor.chain().focus().unsetLink().run()}> <Trash className="h-4 w-4" /> </Button>*/}
        </div>
      </PopoverContent>
    </Popover>
  );
}
