'use client';

import { useComments, useCommentWithAttachments } from '@/hooks/use-comments-api';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Textarea } from '@comp/ui/textarea';
import type { CommentEntityType } from '@db';
import { Camera, FileIcon, Loader2, Paperclip, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CommentFormProps {
  entityId: string;
  entityType: CommentEntityType;
}

export function CommentForm({ entityId, entityType }: CommentFormProps) {
  const [newComment, setNewComment] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [filesToAdd, setFilesToAdd] = useState<File[]>([]);

  // Use SWR hooks for generic comments
  const { mutate: refreshComments } = useComments(entityId, entityType);
  const { createCommentWithFiles } = useCommentWithAttachments();

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    // Validate file sizes
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setFilesToAdd(newFiles);
    setShowReminderDialog(true);
  }, []);

  const handleReminderConfirm = useCallback(() => {
    setShowReminderDialog(false);
    if (filesToAdd.length > 0) {
      setPendingFiles((prev) => [...prev, ...filesToAdd]);
      filesToAdd.forEach((file) => {
        toast.success(`File "${file.name}" ready for attachment.`);
      });
      setFilesToAdd([]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filesToAdd]);

  const handleReminderClose = useCallback(() => {
    setShowReminderDialog(false);
    setFilesToAdd([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRemovePendingFile = (fileIndexToRemove: number) => {
    setPendingFiles((prev) => prev.filter((_, index) => index !== fileIndexToRemove));
    toast.info('File removed from comment draft.');
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      // Use direct API call instead of server action
      await createCommentWithFiles(newComment, entityId, entityType, pendingFiles);

      toast.success('Comment added!');

      // Refresh comments via SWR
      refreshComments();

      // Reset form
      setNewComment('');
      setPendingFiles([]);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
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
    <div className="rounded-lg border border-border bg-muted/10">
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
            placeholder="Leave a comment..."
            className="resize-none border-0 bg-transparent p-4 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            value={newComment}
            onChange={(e: { target: { value: React.SetStateAction<string> } }) =>
              setNewComment(e.target.value)
            }
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
            rows={3}
          />

          {pendingFiles.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-sm group"
                  >
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[150px]" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemovePendingFile(index)}
                      disabled={isSubmitting}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-3 pb-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              onClick={triggerFileInput}
              disabled={isSubmitting}
              aria-label="Add attachment"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              onClick={handleCommentSubmit}
              disabled={isSubmitting || (!newComment.trim() && pendingFiles.length === 0)}
              aria-label="Submit comment"
              className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Comment'}
            </Button>
          </div>
        </div>
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
            <Button onClick={handleReminderConfirm}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
