import type { JSONContent } from '@tiptap/react';
import type { MentionUser } from '@comp/ui/editor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { TaskItem } from '@/hooks/use-task-items';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { TaskRichDescriptionField } from './TaskRichDescriptionField';
import { useTaskItemAttachmentUpload } from './hooks/use-task-item-attachment-upload';
import { TaskItemScrollableDescription } from './TaskItemScrollableDescription';

interface TaskItemEditableDescriptionProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { description?: string }) => Promise<void>;
  onAfterUpdate?: () => void;
  entityId: string;
  entityType: 'risk' | 'vendor';
  descriptionMaxHeightClass?: string;
}

function parseDescription(desc: string | null | undefined): JSONContent | null {
  if (!desc) return null;
  const wrapPlainText = (text: string): JSONContent => {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text,
            },
          ],
        },
      ],
    };
  };

  try {
    const parsed = typeof desc === 'string' ? JSON.parse(desc) : desc;
    if (parsed && typeof parsed === 'object' && (parsed.type === 'doc' || Array.isArray(parsed))) {
      return parsed as JSONContent;
    }

    // Valid JSON, but not a TipTap doc/array — preserve the original content as plain text.
    return wrapPlainText(desc);
  } catch {
    // Not JSON - convert plain text to TipTap JSON format
    return wrapPlainText(desc);
  }
}

export function TaskItemEditableDescription({
  taskItem,
  isUpdating,
  onUpdate,
  onAfterUpdate,
  entityId,
  entityType,
  descriptionMaxHeightClass,
}: TaskItemEditableDescriptionProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState<JSONContent | null>(
    parseDescription(taskItem.description),
  );

  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClosingRef = useRef(false);
  const editingContainerRef = useRef<HTMLDivElement | null>(null);
  const isSelectingMentionRef = useRef(false);
  const isSelectingFileRef = useRef(false);

  const { members } = useOrganizationMembers();
  const mentionMembers: MentionUser[] = useMemo(() => {
    if (!members) return [];
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name || member.user.email || 'Unknown',
      email: member.user.email || '',
      image: member.user.image,
    }));
  }, [members]);

  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const { uploadAttachment, isUploading } = useTaskItemAttachmentUpload({
    entityId,
    entityType,
  });

  const handleFileUpload = async (
    files: File[],
  ): Promise<
    { id: string; name: string; size?: number; downloadUrl?: string; type?: string }[]
  > => {
    const results: { id: string; name: string; size?: number; downloadUrl?: string; type?: string }[] =
      [];

    for (const file of files) {
      const result = await uploadAttachment(file);
      if (result) {
        results.push({
          id: result.id,
          name: result.name,
          size: result.size,
          downloadUrl: result.downloadUrl,
          type: result.type,
        });
      }
    }

    return results;
  };

  // Keep editedDescription in sync if taskItem changes from outside (e.g. realtime refresh)
  useEffect(() => {
    if (!isEditingDescription) {
      setEditedDescription(parseDescription(taskItem.description));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskItem.description]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleDescriptionSave = async () => {
    if (isClosingRef.current) {
      // Prevent double-closing/saving when both document click and blur fire.
      return;
    }

    const descriptionString = editedDescription ? JSON.stringify(editedDescription) : undefined;

    const currentParsed = parseDescription(taskItem.description || '');
    const hasChanged = JSON.stringify(editedDescription) !== JSON.stringify(currentParsed);

    if (!hasChanged) {
      setIsEditingDescription(false);
      return;
    }

    try {
      isClosingRef.current = true;
      await onUpdate({ description: descriptionString });
      setIsEditingDescription(false);
      toast.success('Description updated');
      onAfterUpdate?.();
    } catch {
      toast.error('Failed to update description');
      setEditedDescription(parseDescription(taskItem.description));
    } finally {
      // Reset after close attempt (even if save failed we keep editing open, so allow retry)
      isClosingRef.current = false;
    }
  };

  const hasDescriptionChanged = () => {
    const currentParsed = parseDescription(taskItem.description || '');
    return JSON.stringify(editedDescription) !== JSON.stringify(currentParsed);
  };

  useEffect(() => {
    if (!isEditingDescription) {
      isClosingRef.current = false;
      return;
    }

    // Fallback for cases where blur doesn't fire (e.g. clicking on non-focusable areas).
    const handlePointerDownCapture = (event: PointerEvent) => {
      if (!isEditingDescription) return;
      if (isClosingRef.current) return;
      if (isSelectingMentionRef.current || isSelectingFileRef.current) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const activeTippyBox = document.querySelector('.tippy-box[data-state="visible"]');

      const isInsideEditingContainer = Boolean(
        editingContainerRef.current && editingContainerRef.current.contains(target),
      );
      if (isInsideEditingContainer) return;

      // Ignore clicks that are part of mention/file UI (these shouldn't close the editor).
      const isClickingFileAttachment =
        target.closest('[data-type="file-attachment"]') ||
        target.closest('button[title="Download file"]') ||
        target.closest('button[title="Remove attachment"]') ||
        target.closest('.file-attachment-node');

      const isClickingMentionDropdown =
        target.closest('.tippy-box') ||
        target.closest('[role="listbox"]') ||
        target.closest('.mention') ||
        target.closest('input[type="file"]') ||
        target.closest('button[title="Attach file"]') ||
        activeTippyBox;

      if (isClickingMentionDropdown || isClickingFileAttachment) return;

      // Close immediately (no change) or save+close (changed).
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      if (!hasDescriptionChanged()) {
        isClosingRef.current = true;
        setIsEditingDescription(false);
        // Allow re-opening quickly after state update.
        setTimeout(() => {
          isClosingRef.current = false;
        }, 0);
        return;
      }

      // Save & close (async)
      void (async () => {
        isClosingRef.current = true;
        await onUpdate({
          description: editedDescription ? JSON.stringify(editedDescription) : undefined,
        });
        setIsEditingDescription(false);
        toast.success('Description updated');
        onAfterUpdate?.();
        isClosingRef.current = false;
      })().catch(() => {
        toast.error('Failed to update description');
        isClosingRef.current = false;
      });
    };

    document.addEventListener('pointerdown', handlePointerDownCapture, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownCapture, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingDescription, editedDescription, taskItem.description]);

  return (
    <div className="space-y-2">
      {isEditingDescription ? (
        <div
          ref={editingContainerRef}
          className="space-y-2"
          onBlur={(e) => {
            if (isClosingRef.current) return;
            if (isSelectingMentionRef.current || isSelectingFileRef.current) return;

            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

            const relatedTarget = e.relatedTarget as HTMLElement;
            const activeTippyBox = document.querySelector('.tippy-box[data-state="visible"]');

            const isClickingFileAttachment =
              relatedTarget?.closest('[data-type="file-attachment"]') ||
              relatedTarget?.closest('button[title="Download file"]') ||
              relatedTarget?.closest('button[title="Remove attachment"]') ||
              relatedTarget?.closest('.file-attachment-node');

            const isClickingMentionDropdown =
              relatedTarget?.closest('.tippy-box') ||
              relatedTarget?.closest('[role="listbox"]') ||
              relatedTarget?.closest('.mention') ||
              relatedTarget?.closest('input[type="file"]') ||
              relatedTarget?.closest('button[title="Attach file"]') ||
              activeTippyBox;

            if (
              !e.currentTarget.contains(relatedTarget) &&
              !isClickingMentionDropdown &&
              !isClickingFileAttachment
            ) {
              blurTimeoutRef.current = setTimeout(() => {
                if (isClosingRef.current) return;
                if (
                  !isSelectingMentionRef.current &&
                  !isSelectingFileRef.current &&
                  !document.querySelector('.tippy-box[data-state="visible"]')
                ) {
                  handleDescriptionSave();
                }
              }, 300);
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;

            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            if (!document.querySelector('.tippy-box[data-state="visible"]')) {
              setEditedDescription(parseDescription(taskItem.description));
              setIsEditingDescription(false);
            }
          }}
          tabIndex={-1}
        >
          <TaskRichDescriptionField
            value={editedDescription}
            onChange={(newValue) => setEditedDescription(newValue)}
            onFileUpload={handleFileUpload}
            members={mentionMembers}
            disabled={isUpdating || isUploading}
            placeholder="Add a description... Mention users with @ or attach files"
            onMentionSelect={() => {
              isSelectingMentionRef.current = true;
              setTimeout(() => {
                isSelectingMentionRef.current = false;
              }, 1000);
            }}
            onFileSelectStart={() => {
              isSelectingFileRef.current = true;
            }}
            onFileSelectEnd={() => {
              // Small delay to ensure React state update has propagated
              // before allowing blur/save handlers to run
              setTimeout(() => {
                isSelectingFileRef.current = false;
              }, 50);
            }}
            entityId={entityId}
            entityType={entityType}
          />
        </div>
      ) : (
        <div
          onClick={() => setIsEditingDescription(true)}
          className="text-base cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors min-h-[40px]"
        >
          <TaskItemScrollableDescription
            description={taskItem.description}
            maxHeightClass={descriptionMaxHeightClass}
          />
        </div>
      )}
    </div>
  );
}


