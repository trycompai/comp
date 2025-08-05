'use client';

import { useTaskAttachmentActions, useTaskAttachments } from '@/hooks/use-tasks-api';
import { Button } from '@comp/ui/button';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import type { AttachmentEntityType } from '@db';
import { Loader2, Paperclip, Plus } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AttachmentItem } from './AttachmentItem';

// Removed ApiAttachment interface - using database Attachment type directly

interface TaskBodyProps {
  taskId: string;
  title: string;
  description: string;
  onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}

// Helper function to provide user-friendly error messages
function getErrorMessage(errorMessage: string): string {
  // Simplified error handling since API errors are already user-friendly
  return errorMessage || 'Failed to upload file. Please try again.';
}

export function TaskBody({
  taskId,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  disabled,
}: TaskBodyProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);

  // Auto-resize function for textarea
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
    }
  }, []);

  // Auto-resize on mount and when description changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure the DOM is ready
    const resizeTimeout = requestAnimationFrame(() => {
      autoResizeTextarea();
    });

    return () => cancelAnimationFrame(resizeTimeout);
  }, [description, autoResizeTextarea]);

  // Use SWR to fetch attachments with real-time updates
  const {
    data: attachmentsData,
    error: attachmentsError,
    isLoading: attachmentsLoading,
    mutate: refreshAttachments,
  } = useTaskAttachments(taskId);

  // Use API hooks for mutations
  const { uploadAttachment, getDownloadUrl, deleteAttachment } = useTaskAttachmentActions(taskId);

  // Extract attachments from SWR response
  const attachments = attachmentsData?.data || [];

  const resetState = () => {
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle multiple file uploads using API
  const handleFileSelectMultiple = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      setIsUploading(true);

      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          const MAX_FILE_SIZE_MB = 10;
          const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
            return resolve(null); // Resolve to skip this file
          }

          // Use the API hook's uploadAttachment method
          uploadAttachment(file)
            .then((result) => {
              toast.success(`File "${file.name}" uploaded successfully.`);
              // Refresh attachments via SWR after successful upload
              refreshAttachments();
              resolve(result);
            })
            .catch((error) => {
              console.error(`Failed to upload ${file.name}:`, error);
              const userFriendlyMessage = getErrorMessage(
                error instanceof Error ? error.message : 'Unknown error',
              );
              toast.error(`Failed to upload ${file.name}: ${userFriendlyMessage}`);
              resolve(null); // Resolve even if there's an error to not break Promise.all
            });
        });
      });

      await Promise.all(uploadPromises);

      // Refresh attachments via SWR instead of manual router refresh
      refreshAttachments();
      resetState();
    },
    [uploadAttachment, refreshAttachments],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadClick = async (attachmentId: string) => {
    setBusyAttachmentId(attachmentId);
    try {
      const downloadUrl = await getDownloadUrl(attachmentId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to get download URL:', error);
      toast.error('Failed to get download URL. Please try again.');
    } finally {
      setBusyAttachmentId(null);
    }
  };

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      setBusyAttachmentId(attachmentId);
      try {
        await deleteAttachment(attachmentId);
        toast.success('Attachment deleted successfully.');
        // Refresh attachments via SWR instead of manual router refresh
        refreshAttachments();
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        toast.error('Failed to delete attachment. Please try again.');
      } finally {
        setBusyAttachmentId(null);
      }
    },
    [deleteAttachment, refreshAttachments],
  );

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={onTitleChange}
        className="h-auto shrink-0 border-none bg-transparent p-0 md:text-lg font-semibold tracking-tight shadow-none focus-visible:ring-0"
        placeholder="Task Title"
        disabled={disabled || isUploading || !!busyAttachmentId}
      />
      <Textarea
        ref={textareaRef}
        value={description}
        onChange={(e) => {
          onDescriptionChange(e);
          // Auto-resize after onChange to handle programmatic changes
          setTimeout(autoResizeTextarea, 0);
        }}
        placeholder="Add description..."
        className="text-muted-foreground text-md min-h-[80px] resize-none border-none p-2 shadow-none focus-visible:ring-0"
        disabled={disabled || isUploading || !!busyAttachmentId}
        style={{
          height: 'auto',
          minHeight: '80px',
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectMultiple}
        className="hidden"
        disabled={isUploading || !!busyAttachmentId}
        multiple
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex-1 text-sm font-medium">Attachments</Label>
          {/* Show loading state while fetching attachments or when data hasn't loaded yet */}
          {attachmentsLoading || attachmentsData === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            attachments.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={triggerFileInput}
                disabled={isUploading || !!busyAttachmentId}
                className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center"
                aria-label="Add attachment"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            )
          )}
        </div>

        {/* Show error state if attachments failed to load */}
        {attachmentsError && (
          <p className="text-destructive text-sm">Failed to load attachments. Please try again.</p>
        )}

        {(attachmentsLoading || attachmentsData === undefined) && (
          <div className="space-y-2 pt-1">
            {/* Simplified loading skeleton for attachments */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-muted/20 rounded-lg h-12 animate-pulse"></div>
            ))}
          </div>
        )}

        {!attachmentsLoading && attachmentsData !== undefined && attachments.length > 0 ? (
          <div className="space-y-2 pt-1">
            {attachments.map((attachment) => {
              const isBusy = busyAttachmentId === attachment.id;
              // Use attachment directly since it already has the correct structure
              const attachmentForItem = {
                ...attachment,
                // Ensure proper date objects and types
                createdAt: new Date(attachment.createdAt),
                updatedAt: new Date(attachment.updatedAt),
                entityType: attachment.entityType as AttachmentEntityType,
              };
              return (
                <AttachmentItem
                  key={attachment.id}
                  attachment={attachmentForItem}
                  onClickFilename={handleDownloadClick}
                  onDelete={handleDeleteAttachment}
                  isBusy={isBusy}
                  isParentBusy={isUploading}
                />
              );
            })}
          </div>
        ) : (
          !attachmentsLoading &&
          attachmentsData !== undefined &&
          !attachmentsError &&
          !isUploading &&
          attachmentsData && (
            <p className="text-muted-foreground pt-1 text-sm italic">
              No attachments yet. Click the <Paperclip className="inline h-4 w-4" /> icon above to
              add one.
            </p>
          )
        )}

        {!attachmentsLoading && attachmentsData !== undefined && attachments.length > 0 && (
          <Button
            variant="outline"
            onClick={triggerFileInput}
            disabled={isUploading || !!busyAttachmentId || attachmentsLoading}
            className="mt-2 w-full justify-center gap-2"
            aria-label="Add attachment"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Attachment
          </Button>
        )}
      </div>
    </div>
  );
}
