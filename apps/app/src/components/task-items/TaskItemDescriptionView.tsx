'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { useMemo, useEffect, useCallback } from 'react';
import { defaultExtensions } from '@comp/ui/editor/extensions';
import { createMentionExtension, type MentionUser, validateAndFixTipTapContent } from '@comp/ui/editor';
import { FileAttachment } from '@comp/ui/editor/extensions/file-attachment';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface TaskItemDescriptionViewProps {
  description: string | null | undefined;
  className?: string;
}

export function TaskItemDescriptionView({
  description,
  className,
}: TaskItemDescriptionViewProps) {
  const { members } = useOrganizationMembers();
  // Parse description - could be JSON string or plain string
  const parsedContent = useMemo(() => {
    if (!description) return null;

    try {
      // Try to parse as JSON first
      const parsed = typeof description === 'string' ? JSON.parse(description) : description;
      
      // Validate and fix TipTap content (preserves fileAttachment nodes)
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
  }, [description]);

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

  const resolveDownloadUrl = useCallback(
    async (attachmentId: string): Promise<string | null> => {
      if (!attachmentId) return null;
      try {
        const response = await api.get<{ downloadUrl: string }>(
          `/v1/attachments/${attachmentId}/download`,
        );
        if (response.error || !response.data?.downloadUrl) {
          throw new Error(response.error || 'Download URL not available');
        }
        return response.data.downloadUrl;
      } catch (error) {
        console.error('Failed to refresh attachment download URL:', error);
        toast.error('Failed to refresh attachment download link');
        return null;
      }
    },
    [],
  );

  // File attachment extension for read-only view
  const fileAttachmentExtension = useMemo(
    () =>
      FileAttachment.configure({
        HTMLAttributes: {
          class: 'file-attachment-node',
        },
        getDownloadUrl: resolveDownloadUrl,
      }),
    [resolveDownloadUrl],
  );

  // Memoize extensions array to prevent recreation
  const extensions = useMemo(
    () => [
      ...defaultExtensions({ placeholder: '', openLinksOnClick: true }),
      mentionExtension,
      fileAttachmentExtension,
    ],
    [mentionExtension, fileAttachmentExtension],
  );

  // Create editor instance for read-only rendering
  const editor = useEditor({
    extensions,
    content: parsedContent || '',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none [&_p]:text-base [&_p]:leading-relaxed [&_li]:text-base [&_li]:leading-relaxed',
      },
    },
  });

  // Update content when description changes
  useEffect(() => {
    if (editor && parsedContent) {
      const currentContent = editor.getJSON();
      // Only update if content actually changed
      if (JSON.stringify(currentContent) !== JSON.stringify(parsedContent)) {
        editor.commands.setContent(parsedContent, { emitUpdate: false });
      }
    } else if (editor && !parsedContent) {
      // Clear content if no parsed content
      editor.commands.clearContent(false);
    }
  }, [editor, parsedContent]);

  // If it's TipTap JSON, render with EditorContent
  if (parsedContent && editor) {
    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  // If it's plain text, render as plain text
  return (
    <div className={className}>
      {description ? (
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 text-base">{description}</p>
      ) : (
        <p className="text-muted-foreground italic leading-relaxed text-base">Add a description...</p>
      )}
    </div>
  );
}

