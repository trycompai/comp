'use client';

import { useComments, useCommentWithAttachments } from '@/hooks/use-comments-api';
import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import type { CommentEntityType } from '@db';
import clsx from 'clsx';
import { T, useGT } from 'gt-next';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import { useParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AttachmentItem } from '../../app/(app)/[orgId]/tasks/[taskId]/components/AttachmentItem';

interface CommentFormProps {
  entityId: string;
  entityType: CommentEntityType;
}

// Removed PendingAttachment interface - using File objects directly with API hooks

export function CommentForm({ entityId, entityType }: CommentFormProps) {
  const t = useGT();
  const session = authClient.useSession();
  const params = useParams();
  const [newComment, setNewComment] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Use SWR hooks for generic comments
  const { mutate: refreshComments } = useComments(entityId, entityType);
  const { createCommentWithFiles } = useCommentWithAttachments();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files);

      // Validate file sizes
      const MAX_FILE_SIZE_MB = 10;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            t('File "{fileName}" exceeds the {fileSize}MB limit.', {
              fileName: file.name,
              fileSize: MAX_FILE_SIZE_MB,
            }),
          );
          return;
        }
      }

      // Add files to pending list
      setPendingFiles((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      newFiles.forEach((file) => {
        toast.success(t('File "{fileName}" ready for attachment.', { fileName: file.name }));
      });
    },
    [t],
  );

  const handleRemovePendingFile = (fileIndexToRemove: number) => {
    setPendingFiles((prev) => prev.filter((_, index) => index !== fileIndexToRemove));
    toast.info(t('File removed from comment draft.'));
  };

  const handlePendingFileClick = (fileIndex: number) => {
    const file = pendingFiles[fileIndex];
    if (!file) {
      console.error('Could not find pending file for index:', fileIndex);
      toast.error(t('Could not find file data.'));
      return;
    }

    // Create object URL for preview
    const url = URL.createObjectURL(file);

    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');

    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      // Use direct API call instead of server action
      await createCommentWithFiles(newComment, entityId, entityType, pendingFiles);

      toast.success(t('Comment added!'));

      // Refresh comments via SWR
      refreshComments();

      // Reset form
      setNewComment('');
      setPendingFiles([]);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error(error instanceof Error ? error.message : t('Failed to add comment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Always show the actual form - no loading gate
  // Users can start typing immediately, authentication is checked on submit

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === 'Enter' &&
      !isSubmitting &&
      (newComment.trim() || pendingFiles.length > 0)
    ) {
      event.preventDefault(); // Prevent default newline behavior
      handleCommentSubmit();
    }
  };

  return (
    <div className="bg-foreground/5 rounded-sm border p-0">
      <div className="flex items-start gap-3">
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          disabled={isSubmitting}
        />
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder={t('Leave a comment...')}
            className="resize-none border-none p-4 shadow-none"
            value={newComment}
            onChange={(e: { target: { value: React.SetStateAction<string> } }) =>
              setNewComment(e.target.value)
            }
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          {pendingFiles.length > 0 && (
            <div className="space-y-2 px-4 pt-2">
              <T>
                <Label className="text-muted-foreground text-xs">Pending Files:</Label>
              </T>
              {pendingFiles.map((file, index) => (
                <AttachmentItem
                  key={`${file.name}-${index}`}
                  pendingAttachment={{
                    id: `temp-${index}`,
                    name: file.name,
                    fileType: file.type,
                  }}
                  onClickFilename={() => handlePendingFileClick(index)}
                  onDelete={() => handleRemovePendingFile(index)}
                  isParentBusy={isSubmitting}
                />
              ))}
              {/* Button to add more attachments */}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full justify-center gap-2"
                onClick={triggerFileInput}
                disabled={isSubmitting}
                aria-label={t('Add another attachment')}
              >
                <Paperclip className="h-4 w-4" />
                {t('Add attachment')}
              </Button>
            </div>
          )}

          <div
            className={clsx(
              'flex items-center px-4 pt-1 pb-4',
              pendingFiles.length === 0 ? 'justify-between' : 'justify-end',
            )}
          >
            {pendingFiles.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8 rounded-full"
                onClick={triggerFileInput}
                disabled={isSubmitting}
                aria-label={t('Add attachment')}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-muted-foreground/50 cursor-pointer rounded-full px-2"
              onClick={handleCommentSubmit}
              disabled={isSubmitting || (!newComment.trim() && pendingFiles.length === 0)}
              aria-label={t('Submit comment')}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
