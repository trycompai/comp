'use client';

import '@/styles/editor.css';
import { createMentionExtension, type MentionUser } from '@comp/ui/editor';
import { defaultExtensions } from '@comp/ui/editor/extensions';
import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

type EditorSizeStyle = CSSProperties & {
  '--editor-min-height': string;
  '--editor-height': string;
};

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
  placeholder = 'Leave a comment (mention users with @)',
  onMentionSelect,
}: CommentRichTextFieldProps) {
  const editorSizeStyles: EditorSizeStyle = useMemo(
    () => ({
      '--editor-min-height': '120px',
      '--editor-height': 'auto',
    }),
    [],
  );

  // Use a ref to always have the latest members available to the extension
  const membersRef = useRef(members);
  membersRef.current = members;

  // Search members for mention suggestions
  const searchMembers = useCallback(
    (query: string): MentionUser[] => {
      const currentMembers = membersRef.current;
      if (!currentMembers || currentMembers.length === 0) return [];

      // Show first 20 members immediately when query is empty
      if (!query || query.trim() === '') {
        return currentMembers.slice(0, 20);
      }

      // Filter members based on query
      const lowerQuery = query.toLowerCase();
      return currentMembers
        .filter(
          (member) =>
            member.name?.toLowerCase().includes(lowerQuery) ||
            member.email?.toLowerCase().includes(lowerQuery) ||
            member.id?.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 20);
    },
    [],
  );

  // Create mention extension once - it reads members via ref so it always has latest data
  const mentionExtension = useMemo(
    () =>
      createMentionExtension({
        suggestion: {
          char: '@',
          items: ({ query }) => {
            return searchMembers(query) || [];
          },
          onSelect: () => {
            onMentionSelect?.();
          },
        },
      }),
    [searchMembers, onMentionSelect],
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
    [disabled, placeholder],
  );

  // Sync external value changes to editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const currentContent = editor.getJSON();
    if (value && JSON.stringify(currentContent) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    } else if (!value && currentContent.content && currentContent.content.length > 0) {
      editor.commands.setContent('', { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div
      className="rounded-md bg-background"
      style={{ ...editorSizeStyles, minHeight: 'var(--editor-min-height)' }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
