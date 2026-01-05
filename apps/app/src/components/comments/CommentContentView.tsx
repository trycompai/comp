'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';

type EditorSizeStyle = CSSProperties & {
  '--editor-min-height': string;
  '--editor-height': string;
};
import { defaultExtensions } from '@comp/ui/editor/extensions';
import { createMentionExtension, type MentionUser, validateAndFixTipTapContent } from '@comp/ui/editor';
import { useOrganizationMembers } from '@/hooks/use-organization-members';

interface CommentContentViewProps {
  content: string;
  className?: string;
}

export function CommentContentView({
  content,
  className,
}: CommentContentViewProps) {
  const { members } = useOrganizationMembers();
  const editorSizeStyles: EditorSizeStyle = useMemo(
    () => ({
      '--editor-min-height': '20px',
      '--editor-height': 'auto',
    }),
    [],
  );

  // Parse content - could be JSON string or plain string
  const parsedContent = useMemo(() => {
    if (!content) return null;

    try {
      // Try to parse as JSON first
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Validate and fix TipTap content
      const validated = validateAndFixTipTapContent(parsed);
      
      // Check if it's a valid TipTap JSON structure
      if (validated && typeof validated === 'object' && validated.type === 'doc') {
        return validated as JSONContent;
      }
      
      // If not valid JSON structure, return null to show as plain text
      return null;
    } catch {
      // Not JSON, return null to show as plain text
      return null;
    }
  }, [content]);

  // Get members for mention rendering
  const mentionMembers: MentionUser[] = useMemo(() => {
    if (!members) return [];
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name || member.user.email || 'Unknown',
      email: member.user.email || '',
      image: member.user.image,
    }));
  }, [members]);

  // Create mention extension for rendering mentions
  const mentionExtension = useMemo(
    () =>
      createMentionExtension({
        suggestion: {
          char: '@',
          items: () => mentionMembers,
        },
      }),
    [mentionMembers],
  );

  // Memoize extensions array to prevent recreation
  const extensions = useMemo(
    () => [
      ...defaultExtensions({ placeholder: '', openLinksOnClick: true }),
      mentionExtension,
    ],
    [mentionExtension],
  );

  // Create editor instance for read-only rendering
  const editor = useEditor({
    extensions,
    content: parsedContent || '',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-sm max-w-none focus:outline-none text-sm [&_p]:m-0 [&_p]:p-0 [&_p]:text-sm [&_p]:leading-normal [&_li]:text-sm [&_li]:leading-normal',
      },
    },
  });

  // Update content when description changes
  useEffect(() => {
    if (editor && parsedContent) {
      const currentContent = editor.getJSON();
      // Only update if content actually changed
      if (JSON.stringify(currentContent) !== JSON.stringify(parsedContent)) {
        editor.commands.setContent(parsedContent, false);
      }
    } else if (editor && !parsedContent) {
      // Clear content if no parsed content
      editor.commands.clearContent(false);
    }
  }, [editor, parsedContent]);

  // If it's TipTap JSON, render with EditorContent
  if (parsedContent && editor) {
    return (
      <div className={className} style={editorSizeStyles}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  // If it's plain text, render as plain text with link support
  return (
    <div className={className}>
      {content ? (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi).map((part, index) => {
            if (/^(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(part)) {
              const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
              return (
                <a
                  key={index}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {part}
                </a>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>
      ) : (
        <p className="text-muted-foreground italic text-sm">No content</p>
      )}
    </div>
  );
}

