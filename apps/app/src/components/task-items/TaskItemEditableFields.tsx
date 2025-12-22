'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { TaskItem } from '@/hooks/use-task-items';
import { TaskItemDescriptionView } from './TaskItemDescriptionView';
import { TaskRichDescriptionField } from './TaskRichDescriptionField';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { useTaskItemAttachmentUpload } from './hooks/use-task-item-attachment-upload';
import type { JSONContent } from '@tiptap/react';
import type { MentionUser } from '@comp/ui/editor';

interface TaskItemEditableFieldsProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
  entityId: string;
  entityType: 'risk' | 'vendor';
}

export function TaskItemEditableFields({
  taskItem,
  isUpdating,
  onUpdate,
  onStatusOrPriorityChange,
  entityId,
  entityType,
}: TaskItemEditableFieldsProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskItem.title);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingMentionRef = useRef(false);
  const isSelectingFileRef = useRef(false);
  
  // Parse description - could be JSON string or plain string
  const parseDescription = (desc: string | null | undefined): JSONContent | null => {
    if (!desc) return null;
    try {
      const parsed = typeof desc === 'string' ? JSON.parse(desc) : desc;
      if (parsed && typeof parsed === 'object' && (parsed.type === 'doc' || Array.isArray(parsed))) {
        return parsed as JSONContent;
      }
    } catch {
      // Not JSON, return null
    }
    return null;
  };

  const [editedDescription, setEditedDescription] = useState<JSONContent | null>(
    parseDescription(taskItem.description),
  );

  const { members } = useOrganizationMembers();
  
  // All members for mentions
  const mentionMembers: MentionUser[] = members
    ? members.map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.email || 'Unknown',
        email: member.user.email || '',
        image: member.user.image,
      }))
    : [];

  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleSave = async () => {
    if (!editedTitle.trim()) {
      toast.error('Title cannot be empty');
      setEditedTitle(taskItem.title);
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle.trim() === taskItem.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await onUpdate({ title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Title updated');
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update title');
      setEditedTitle(taskItem.title);
    }
  };

  const handleDescriptionSave = async () => {
    // Convert JSONContent to string for API
    const descriptionString = editedDescription
      ? JSON.stringify(editedDescription)
      : undefined;

    // Check if description actually changed
    const currentDescription = taskItem.description || '';
    const currentParsed = parseDescription(currentDescription);
    const hasChanged =
      JSON.stringify(editedDescription) !== JSON.stringify(currentParsed);

    if (!hasChanged) {
      setIsEditingDescription(false);
      return;
    }

    try {
      await onUpdate({ description: descriptionString });
      setIsEditingDescription(false);
      toast.success('Description updated');
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update description');
      setEditedDescription(parseDescription(taskItem.description));
    }
  };

  const { uploadAttachment, isUploading } = useTaskItemAttachmentUpload({
    entityId,
    entityType,
  });

  const handleFileUpload = async (
    files: File[],
  ): Promise<
    { id: string; name: string; size?: number; downloadUrl?: string; type?: string }[]
  > => {
    const results = [];
    
    for (const file of files) {
      try {
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
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    return results;
  };

  return (
    <>
      {/* Title - Inline editable */}
      <div className="space-y-2 mt-2">
        {isEditingTitle ? (
          <div className="space-y-2">
            <textarea
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => {
                setEditedTitle(e.target.value);
                // Auto-resize textarea
                if (titleInputRef.current) {
                  titleInputRef.current.style.height = 'auto';
                  titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
                }
              }}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === 'Escape') {
                  setEditedTitle(taskItem.title);
                  setIsEditingTitle(false);
                }
              }}
              disabled={isUpdating}
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none resize-none rounded px-2 py-1 -mx-2 -my-1 overflow-hidden"
              rows={1}
            />
          </div>
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="text-2xl font-semibold cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          >
            {taskItem.title}
          </h1>
        )}
      </div>

      {/* Description - Inline editable */}
      <div className="space-y-2">
        {isEditingDescription ? (
          <div
            className="space-y-2"
            onBlur={(e) => {
              // Don't save if we're selecting a mention or working with files
              if (isSelectingMentionRef.current || isSelectingFileRef.current) {
                return;
              }

              // Clear any existing timeout
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
              }

              // Check if the blur is caused by clicking on mention dropdown, tippy popup, file input, or file attachment buttons
              const relatedTarget = e.relatedTarget as HTMLElement;
              const activeTippyBox = document.querySelector('.tippy-box[data-state="visible"]');
              
              // Check for file attachment interactions
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

              // Only save if focus is moving outside the editing area AND not clicking on mention dropdown, file input, or file attachment buttons
              if (!e.currentTarget.contains(relatedTarget) && !isClickingMentionDropdown && !isClickingFileAttachment) {
                // Delay the save to allow any interactions to complete
                blurTimeoutRef.current = setTimeout(() => {
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
              if (e.key === 'Escape') {
                // Clear any pending blur timeout
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                }
                // Don't exit if tippy is open
                if (!document.querySelector('.tippy-box[data-state="visible"]')) {
                  setEditedDescription(parseDescription(taskItem.description));
                  setIsEditingDescription(false);
                }
              }
            }}
            tabIndex={-1}
          >
              <TaskRichDescriptionField
                value={editedDescription}
                onChange={(newValue) => {
                  setEditedDescription(newValue);
                  // When content changes (mention inserted), keep editing mode open
                  // The blur handler will handle saving when user clicks outside
                }}
                onFileUpload={handleFileUpload}
                members={mentionMembers}
                disabled={isUpdating || isUploading}
                placeholder="Add a description... Mention users with @ or attach files"
                onMentionSelect={() => {
                  // Set flag when mention is being selected to prevent blur save
                  isSelectingMentionRef.current = true;
                  // Keep flag true for longer to ensure mention insertion completes
                  setTimeout(() => {
                    isSelectingMentionRef.current = false;
                  }, 1000);
                }}
                onFileSelectStart={() => {
                  // Set flag when file selection starts to prevent blur save
                  isSelectingFileRef.current = true;
                }}
                onFileSelectEnd={() => {
                  // Clear flag when file selection ends
                  // Delay to ensure file dialog is closed and focus returns
                  setTimeout(() => {
                    isSelectingFileRef.current = false;
                  }, 500);
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
            <TaskItemDescriptionView description={taskItem.description} />
          </div>
        )}
      </div>
    </>
  );
}

