'use client';

import type { JSONContent } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useMemo, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';

type EditorSizeStyle = CSSProperties & {
  '--editor-min-height': string;
  '--editor-height': string;
};
import { createMentionExtension, type MentionUser } from '@comp/ui/editor';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from '@comp/ui/editor/extensions';

interface CommentRichTextFieldProps {
  value: JSONContent | null;
  onChange: (value: JSONContent | null) => void;
  members: MentionUser[];
  disabled?: boolean;
  placeholder?: string;
  onMentionSelect?: () => void;
}

export function CommentRichTextField({
  value,
  onChange,
  members,
  disabled = false,
  placeholder = 'Leave a comment... Mention users with @',
  onMentionSelect,
}: CommentRichTextFieldProps) {
  const editorSizeStyles: EditorSizeStyle = useMemo(
    () => ({
      '--editor-min-height': '120px',
      '--editor-height': 'auto',
    }),
    [],
  );

  // Search members for mention suggestions - use the members prop directly
  const searchMembers = useCallback(
    (query: string): MentionUser[] => {
      if (!members || members.length === 0) return [];
      
      // Show first 20 members immediately when query is empty
      if (!query || query.trim() === '') {
        return members.slice(0, 20);
      }

      // Filter members based on query
      const lowerQuery = query.toLowerCase();
      return members
        .filter(
          (member) =>
            member.name?.toLowerCase().includes(lowerQuery) ||
            member.email?.toLowerCase().includes(lowerQuery) ||
            member.id?.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 20);
    },
    [members],
  );

  // Debounced version for when user is typing
  const debouncedSearchMembers = useDebouncedCallback(searchMembers, 250);

  // Create mention extension with member search
  const mentionExtension = useMemo(
    () =>
      createMentionExtension({
        suggestion: {
          char: '@',
          items: ({ query }) => {
            // Use immediate search for empty query, debounced for typed queries
            if (!query || query.trim() === '') {
              return searchMembers(query) || [];
            }
            return debouncedSearchMembers(query) || [];
          },
          onSelect: () => {
            // Notify parent that a mention is being selected
            onMentionSelect?.();
          },
        },
      }),
    [members, searchMembers, debouncedSearchMembers, onMentionSelect],
  );

  // Memoize extensions array to prevent recreation
  const extensions = useMemo(
    () => [...defaultExtensions({ placeholder }), mentionExtension],
    [placeholder, mentionExtension],
  );

  const editor = useEditor(
    {
      extensions,
      content: value || '',
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (!editor.isDestroyed) {
          const content = editor.getJSON();
          onChange(content);
        }
      },
      editorProps: {
        attributes: {
          class:
            'comment-editor prose-sm max-w-none focus:outline-none px-3 py-2 text-sm [&_p]:m-0 [&_p]:p-0 [&_p]:text-sm [&_p]:leading-normal',
        },
      },
    },
    // TipTap only creates the Editor once by default. After a hard refresh, members often
    // load async via SWR, so we re-create the editor when the members list becomes available.
    // (This is why "navigate away and back" fixed it before.)
    [members.length, disabled, placeholder],
  );

  // Sync external value changes to editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const currentContent = editor.getJSON();
    if (value && JSON.stringify(currentContent) !== JSON.stringify(value)) {
      editor.commands.setContent(value, false);
    } else if (!value && currentContent.content && currentContent.content.length > 0) {
      editor.commands.setContent('', false);
    }
  }, [value, editor]);

  return (
    <div className="rounded-md border border-input bg-background [&_.ProseMirror_p.is-empty::before]:text-muted-foreground/50" style={editorSizeStyles}>
      <EditorContent editor={editor} />
    </div>
  );
}

