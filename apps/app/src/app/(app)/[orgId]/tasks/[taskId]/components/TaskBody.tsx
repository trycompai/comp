'use client';

import { useTaskAttachmentActions, useTaskAttachments } from '@/hooks/use-tasks-api';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Camera, FileIcon, FileText, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const [isDragging, setIsDragging] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | File[] | null>(null);

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

  // Process files (used by both file input and drag & drop)
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);

      // Blocked file extensions for security
      const BLOCKED_EXTENSIONS = [
        'exe',
        'bat',
        'cmd',
        'com',
        'scr',
        'msi', // Windows executables
        'js',
        'vbs',
        'vbe',
        'wsf',
        'wsh',
        'ps1', // Scripts
        'sh',
        'bash',
        'zsh', // Shell scripts
        'dll',
        'sys',
        'drv', // System files
        'app',
        'deb',
        'rpm', // Application packages
        'jar', // Java archives (can execute)
        'pif',
        'lnk',
        'cpl', // Shortcuts and control panel
        'hta',
        'reg', // HTML apps and registry
      ];

      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          // Check file extension
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          if (fileExt && BLOCKED_EXTENSIONS.includes(fileExt)) {
            toast.error(
              `File "${file.name}" has a blocked extension (.${fileExt}) for security reasons.`,
            );
            return resolve(null);
          }

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

  const initiateUpload = useCallback((files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setPendingFiles(files);
    setShowReminderDialog(true);
  }, []);

  const handleReminderConfirm = useCallback(() => {
    setShowReminderDialog(false);
    if (pendingFiles) {
      processFiles(pendingFiles);
      setPendingFiles(null);
    }
  }, [pendingFiles, processFiles]);

  const handleReminderClose = useCallback(() => {
    setShowReminderDialog(false);
    setPendingFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileSelectMultiple = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      initiateUpload(files);
    },
    [initiateUpload],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading || busyAttachmentId) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        initiateUpload(Array.from(files));
      }
    },
    [isUploading, busyAttachmentId, initiateUpload],
  );

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

        {!attachmentsLoading && attachmentsData !== undefined && (
          <div className="space-y-3">
            {/* Existing attachments list */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => {
                  const isBusy = busyAttachmentId === attachment.id;
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
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleDownloadClick(attachment.id)}
                        disabled={isBusy || isUploading}
                        className="h-auto p-0 text-sm max-w-[200px] truncate"
                        title={attachment.name}
                      >
                        {attachment.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        disabled={isBusy || isUploading}
                        className="h-auto w-auto p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-transparent"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drag and drop zone - always visible */}
            <Button
              variant="outline"
              onClick={triggerFileInput}
              disabled={isUploading || !!busyAttachmentId}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="group w-full h-auto rounded-md border-dashed border-2 px-6 py-8 text-center transition-all hover:border-primary/50 hover:bg-accent/30"
              style={{
                borderColor: isDragging ? 'hsl(var(--primary))' : undefined,
                backgroundColor: isDragging ? 'hsl(var(--accent))' : undefined,
              }}
            >
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <div className="rounded-full bg-muted/50 p-3 transition-colors group-hover:bg-primary/10">
                    <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium transition-colors group-hover:text-foreground">
                    {isUploading
                      ? 'Uploading...'
                      : isDragging
                        ? 'Drop files here'
                        : 'Drag and drop files here'}
                  </span>
                  {!isUploading && !isDragging && (
                    <span className="text-xs text-muted-foreground transition-colors group-hover:text-muted-foreground/80">
                      or click to browse • max 10MB • most file types accepted
                    </span>
                  )}
                </div>
              </div>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showReminderDialog} onOpenChange={(open) => !open && handleReminderClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>Screenshot Requirements</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Ensure your organisation name is clearly visible within the screenshot.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Auditors require this to verify the source of the data; without it, evidence may be
            rejected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleReminderClose}>
              Cancel
            </Button>
            <Button onClick={handleReminderConfirm}>Continue Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
