'use client';

import { uploadFile } from '@/actions/files/upload-file';
import { authClient } from '@/utils/auth-client';
import type { AttachmentEntityType, CommentEntityType } from '@comp/db/types';
import { Button } from '@comp/ui/button';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import clsx from 'clsx';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { createComment } from '@/actions/comments/createComment';
import { AttachmentItem } from '../../app/(app)/[orgId]/tasks/[taskId]/components/AttachmentItem';
import { Input } from '@comp/ui/input';

interface CommentFormProps {
  entityId: string;
  entityType: CommentEntityType;
}

interface PendingAttachment {
  id: string;
  name: string;
  fileType: string;
  signedUrl: string | null;
}

export function CommentForm({ entityId, entityType }: CommentFormProps) {
  const session = authClient.useSession();
  const router = useRouter();
  const params = useParams();
  const [newComment, setNewComment] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  let pathToRevalidate = '';
  switch (entityType) {
    case 'task':
      pathToRevalidate = `/${params.orgId}/tasks/${entityId}`;
      break;
    case 'vendor':
      pathToRevalidate = `/${params.orgId}/vendors/${entityId}`;
      break;
    case 'risk':
      pathToRevalidate = `/${params.orgId}/risks/${entityId}`;
      break;
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);

      // Helper to process a single file
      const processFile = (file: File) => {
        return new Promise<void>((resolve) => {
          // Add file size check here
          const MAX_FILE_SIZE_MB = 5;
          const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
            return resolve(); // Skip processing this file
          }

          if (!file.type.startsWith('image/')) {
            toast.info('Only image previews are shown before submitting.');
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrlResult = reader.result as string;
            const base64Data = dataUrlResult?.split(',')[1];
            if (!base64Data) {
              toast.error(`Failed to read file data for ${file.name}`);
              return resolve();
            }
            const { success, data, error } = await uploadFile({
              fileName: file.name,
              fileType: file.type,
              fileData: base64Data,
              entityId,
              entityType: entityType as AttachmentEntityType,
              pathToRevalidate,
            });
            if (error) {
              console.error('Upload file action error occurred:', error);
              toast.error(`Failed to upload "${file.name}": ${error}`);
            } else if (success && data?.id && data.signedUrl) {
              setPendingAttachments((prev) => [
                ...prev,
                {
                  id: data?.id ?? '',
                  name: data?.name ?? '',
                  fileType: file.type,
                  signedUrl: data.signedUrl,
                },
              ]);
              toast.success(`File "${data?.name ?? 'unknown'}" ready for attachment.`);
            } else {
              console.error('Upload succeeded but missing data:', data);
              toast.error(`Failed to process "${file.name}" after upload.`);
            }
            resolve();
          };
          reader.onerror = () => {
            toast.error(`Error reading file: ${file.name}`);
            resolve();
          };
          reader.readAsDataURL(file);
        });
      };

      // Process all files sequentially
      (async () => {
        for (const file of Array.from(files)) {
          await processFile(file);
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      })();
    },
    [entityId, entityType, pendingAttachments.length],
  );

  const handleRemovePendingAttachment = (attachmentIdToRemove: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== attachmentIdToRemove));
    toast.info('Attachment removed from comment draft.');
  };

  const handlePendingAttachmentClick = (attachmentId: string) => {
    const pendingAttachment = pendingAttachments.find((att) => att.id === attachmentId);
    if (!pendingAttachment) {
      console.error('Could not find pending attachment for ID:', attachmentId);
      toast.error('Could not find attachment data.');
      return;
    }

    console.log(
      'DEBUG: Opening signed URL for:',
      pendingAttachment.name,
      pendingAttachment.signedUrl,
    );
    const { signedUrl } = pendingAttachment;

    if (signedUrl) {
      try {
        // Directly open the signed URL
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error('Error opening signed URL:', e);
        toast.error('Could not open attachment preview.');
      }
    } else {
      // Handle case where signedUrl might be missing/null (shouldn't happen if upload worked)
      toast.error('Attachment preview URL is not available.');
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() && pendingAttachments.length === 0) return;

    const { success, data, error } = await createComment({
      content: newComment,
      entityId,
      entityType,
      attachmentIds: pendingAttachments.map((att) => att.id),
      pathToRevalidate,
    });

    if (success && data) {
      toast.success('Comment added!');
      setNewComment('');
      setPendingAttachments([]);
    }

    if (error) {
      toast.error(error);
    }
  };

  const isLoading = isUploading || session.isPending;

  if (!hasMounted || session.isPending) {
    return (
      <div className="animate-pulse space-y-3 rounded-sm border p-3">
        <div className="flex items-start gap-3">
          <div className="bg-muted h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-1/4 rounded-sm" />
            <div className="bg-muted h-20 w-full rounded-sm" />
          </div>
        </div>
        <div className="bg-muted h-8 w-full rounded-sm" />
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === 'Enter' &&
      !isLoading &&
      (newComment.trim() || pendingAttachments.length > 0)
    ) {
      event.preventDefault(); // Prevent default newline behavior
      handleCommentSubmit();
    }
  };

  return (
    <div className="bg-foreground/5 rounded-sm border p-0">
      <div className="flex items-start gap-3">
        <Input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Leave a comment..."
            className="resize-none border-none p-4 shadow-none"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          {pendingAttachments.length > 0 && (
            <div className="space-y-2 px-4 pt-2">
              <Label className="text-muted-foreground text-xs">Pending Attachments:</Label>
              {pendingAttachments.map((pendingAttachment) => (
                <AttachmentItem
                  key={pendingAttachment.id}
                  pendingAttachment={pendingAttachment}
                  onClickFilename={handlePendingAttachmentClick} // Pass the correct handler
                  onDelete={handleRemovePendingAttachment}
                  isParentBusy={isLoading} // Disable if form is loading/uploading
                />
              ))}
              {/* Button to add more attachments */}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full justify-center gap-2"
                onClick={triggerFileInput}
                disabled={isLoading}
                aria-label="Add another attachment"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                Add attachment
              </Button>
            </div>
          )}

          <div
            className={clsx(
              'flex items-center px-4 pt-1 pb-4',
              pendingAttachments.length === 0 ? 'justify-between' : 'justify-end',
            )}
          >
            {pendingAttachments.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8 rounded-full"
                onClick={triggerFileInput}
                disabled={isLoading}
                aria-label="Add attachment"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-muted-foreground/50 cursor-pointer rounded-full px-2"
              onClick={handleCommentSubmit}
              disabled={isLoading || (!newComment.trim() && pendingAttachments.length === 0)}
              aria-label="Submit comment"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
