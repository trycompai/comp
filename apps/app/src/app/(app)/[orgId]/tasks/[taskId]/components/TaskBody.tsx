'use client';

import { uploadFile } from '@/actions/files/upload-file';
import type { Attachment } from '@comp/db/types';
import { AttachmentEntityType } from '@comp/db/types';
import { Button } from '@comp/ui/button';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { Loader2, Paperclip, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteTaskAttachment } from '../../actions/deleteTaskAttachment';
import { getTaskAttachmentUrl } from '../../actions/getTaskAttachmentUrl';
import { AttachmentItem } from './AttachmentItem';

interface TaskBodyProps {
  taskId: string;
  title: string;
  description: string;
  attachments: Attachment[];
  onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  onAttachmentsChange?: () => void;
}

export function TaskBody({
  taskId,
  title,
  description,
  attachments = [],
  onTitleChange,
  onDescriptionChange,
  disabled,
  onAttachmentsChange,
}: TaskBodyProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);
  const router = useRouter();

  const resetState = () => {
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      setIsUploading(true);
      try {
        const uploadedAttachments = [];
        for (const file of Array.from(files)) {
          const MAX_FILE_SIZE_MB = 5;
          const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
            continue;
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string)?.split(',')[1];
            if (!base64Data) {
              toast.error('Failed to read file data.');
              resetState();
              return;
            }
            const { success, data, error } = await uploadFile({
              fileName: file.name,
              fileType: file.type,
              fileData: base64Data,
              entityId: taskId,
              entityType: AttachmentEntityType.task,
            });

            if (success && data) {
              uploadedAttachments.push(data);
            } else {
              const errorMessage = error || 'Failed to process attachment after upload.';
              toast.error(String(errorMessage));
            }
          };
          reader.onerror = () => {
            toast.error('Error reading file.');
            resetState();
          };
          reader.readAsDataURL(file);
          await new Promise<void>((resolve) => {
            const intervalId = setInterval(() => {
              if (reader.readyState === FileReader.DONE) {
                clearInterval(intervalId);
                resolve(undefined);
              }
            }, 100);
          });
        }
        onAttachmentsChange?.();
        router.refresh();
      } finally {
        setIsUploading(false);
      }
    },
    [taskId, uploadFile, onAttachmentsChange, router],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadClick = async (attachmentId: string) => {
    setBusyAttachmentId(attachmentId);
    try {
      const { success, data, error } = await getTaskAttachmentUrl({
        attachmentId,
      });

      if (success && data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error(String(error || 'Failed to get attachment URL.'));
      }
    } catch (err) {
      toast.error('An unexpected error occurred while fetching the attachment URL.');
    } finally {
      setBusyAttachmentId(null);
    }
  };

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      setBusyAttachmentId(attachmentId);
      await deleteTaskAttachment({ attachmentId });

      setBusyAttachmentId(null);
      onAttachmentsChange?.();
      router.refresh();
    },
    [deleteTaskAttachment, onAttachmentsChange, router],
  );

  const isUploadingFile = isUploading;

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={onTitleChange}
        className="h-auto shrink-0 border-none bg-transparent p-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
        placeholder="Task Title"
        disabled={disabled || isUploadingFile || !!busyAttachmentId}
      />
      <Textarea
        value={description}
        onChange={onDescriptionChange}
        placeholder="Add description..."
        className="text-muted-foreground text-md min-h-[80px] resize-none border-none p-0 shadow-none focus-visible:ring-0"
        disabled={disabled || isUploadingFile || !!busyAttachmentId}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploadingFile || !!busyAttachmentId}
        multiple
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex-1 text-sm font-medium">Attachments</Label>
          {attachments.length === 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={triggerFileInput}
              disabled={isUploadingFile || !!busyAttachmentId}
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center"
              aria-label="Add attachment"
            >
              {isUploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {attachments.length > 0 ? (
          <div className="space-y-2 pt-1">
            {attachments.map((attachment) => {
              const isBusy = busyAttachmentId === attachment.id;
              return (
                <AttachmentItem
                  key={attachment.id}
                  attachment={attachment}
                  onClickFilename={handleDownloadClick}
                  onDelete={handleDeleteAttachment}
                  isBusy={isBusy}
                  isParentBusy={isUploadingFile}
                />
              );
            })}
          </div>
        ) : (
          !isUploadingFile && (
            <p className="text-muted-foreground pt-1 text-sm italic">
              No attachments yet. Click the <Paperclip className="inline h-4 w-4" /> icon above to
              add one.
            </p>
          )
        )}

        {attachments.length > 0 && (
          <Button
            variant="outline"
            onClick={triggerFileInput}
            disabled={isUploadingFile || !!busyAttachmentId}
            className="mt-2 w-full justify-center gap-2"
            aria-label="Add attachment"
          >
            {isUploadingFile ? (
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
