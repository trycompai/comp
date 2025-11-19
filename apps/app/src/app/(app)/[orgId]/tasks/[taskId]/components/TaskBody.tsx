'use client';

import { useTaskAttachmentActions, useTaskAttachments } from '@/hooks/use-tasks-api';
import type { AttachmentEntityType } from '@trycompai/db';
import { FileIcon, FileText, ImageIcon, Loader2, Plus, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Removed ApiAttachment interface - using database Attachment type directly

interface TaskBodyProps {
  taskId: string;
  title?: string;
  description?: string;
  onTitleChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectMultiple}
        className="hidden"
        disabled={isUploading || !!busyAttachmentId}
        multiple
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Attachments
          </h3>
        </div>

        {/* Show error state if attachments failed to load */}
        {attachmentsError && (
          <p className="text-destructive text-sm">Failed to load attachments. Please try again.</p>
        )}

        {(attachmentsLoading || attachmentsData === undefined) && (
          <div className="flex flex-wrap gap-2">
            {/* Enhanced loading skeleton for attachments */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 border border-border/50 rounded-md h-8 animate-pulse"
                style={{ width: `${80 + i * 20}px` }}
              >
                <div className="w-3.5 h-3.5 bg-muted/50 rounded" />
                <div className="flex-1 h-3 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        )}

        {!attachmentsLoading && attachmentsData !== undefined && attachments.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
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
                const fileExt = attachment.name.split('.').pop()?.toLowerCase() || '';
                const isPDF = fileExt === 'pdf';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                const isDoc = ['doc', 'docx'].includes(fileExt);

                const getFileTypeStyles = () => {
                  if (isPDF)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  if (isImage)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  if (isDoc)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  return 'bg-muted/50 border-border hover:bg-muted/70';
                };

                const getFileIconColor = () => {
                  if (isPDF || isImage || isDoc) return 'text-primary';
                  return 'text-muted-foreground';
                };

                return (
                  <div
                    key={attachment.id}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 border rounded-md transition-all group ${getFileTypeStyles()} `}
                  >
                    {isPDF ? (
                      <FileText className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : isImage ? (
                      <ImageIcon className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : isDoc ? (
                      <FileText className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : (
                      <FileIcon className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    )}
                    <button
                      onClick={() => handleDownloadClick(attachment.id)}
                      disabled={isBusy || isUploading}
                      className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed max-w-[200px] truncate"
                      title={attachment.name}
                    >
                      {attachment.name}
                    </button>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      disabled={isBusy || isUploading}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                );
              })}
              {/* Add button inline with attachments */}
              <button
                onClick={triggerFileInput}
                disabled={isUploading || !!busyAttachmentId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-dashed border-border/40 hover:border-border/60 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Add
              </button>
            </div>
          </div>
        ) : (
          !attachmentsLoading &&
          attachmentsData !== undefined &&
          attachments.length === 0 && (
            <button
              onClick={triggerFileInput}
              disabled={isUploading || !!busyAttachmentId}
              className="w-full rounded-md border border-dashed border-border/30 bg-muted/30 px-3 py-4 text-center hover:border-border/50 hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1.5">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isUploading ? 'Uploading...' : 'Add file'}
                </span>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
}
