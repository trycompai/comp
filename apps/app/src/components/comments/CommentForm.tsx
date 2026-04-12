'use client';

import { useComments, useCommentWithAttachments } from '@/hooks/use-comments-api';
import { useMentionableMembers } from '@/hooks/use-mentionable-members';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Kbd,
  KbdGroup,
  Spinner,
} from '@trycompai/design-system';
import { Attachment, Close, Document } from '@trycompai/design-system/icons';
import type { CommentEntityType } from '@db';
import type { JSONContent } from '@tiptap/react';
import { useParams, usePathname } from 'next/navigation';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CommentRichTextField } from './CommentRichTextField';

interface CommentFormProps {
  entityId: string;
  entityType: CommentEntityType;
  /** Resource to check for mention filtering. Defaults to entityType. */
  mentionResource?: string;
  /** Optional org override; otherwise uses `orgId` from URL params */
  organizationId?: string;
}

export function CommentForm({ entityId, entityType, mentionResource, organizationId }: CommentFormProps) {
  const [newComment, setNewComment] = useState<JSONContent | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [filesToAdd, setFilesToAdd] = useState<File[]>([]);
  const [isSelectingMention, setIsSelectingMention] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const orgIdFromParams =
    typeof params?.orgId === 'string'
      ? params.orgId
      : Array.isArray(params?.orgId)
        ? params.orgId[0]
        : undefined;
  const resolvedOrgId = organizationId ?? orgIdFromParams;

  // Use SWR hooks for generic comments
  // Pass organizationId explicitly to ensure correct org context
  const { mutate: refreshComments } = useComments(entityId, entityType, {
    organizationId: resolvedOrgId,
    enabled: Boolean(resolvedOrgId),
  });
  const { createCommentWithFiles } = useCommentWithAttachments();
  const { members: mentionMembers } = useMentionableMembers(mentionResource ?? entityType);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files);

      // Validate file sizes
      const MAX_FILE_SIZE_MB = 100;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      // Skip modal if we're on risks or vendors pages - directly add files
      const isRiskPage = pathname?.includes('/risk/');
      const isVendorPage = pathname?.includes('/vendors/');

      if (isRiskPage || isVendorPage) {
        setPendingFiles((prev) => [...prev, ...newFiles]);
        newFiles.forEach((file) => {
          toast.success(`File "${file.name}" ready for attachment.`);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Show modal for policies and other pages
      setFilesToAdd(newFiles);
      setShowReminderDialog(true);
    },
    [entityType, pathname],
  );

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

  // Convert TipTap JSON to string for API
  const getCommentText = useCallback((content: JSONContent | null): string => {
    if (!content) return '';

    // If it's a valid TipTap doc, convert to JSON string
    if (content.type === 'doc' && content.content) {
      return JSON.stringify(content);
    }

    return '';
  }, []);

  // Check if comment has content
  const hasContent = useCallback((content: JSONContent | null): boolean => {
    if (!content) return false;

    const hasContentInNode = (node: JSONContent): boolean => {
      if (node.type === 'mention') return true;
      if (node.type === 'text' && node.text?.trim()) return true;

      if (!node.content || node.content.length === 0) return false;
      return node.content.some(hasContentInNode);
    };

    return hasContentInNode(content);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isSubmitting && !isSelectingMention) {
        e.preventDefault();
        handleCommentSubmit();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newComment, pendingFiles, isSubmitting, isSelectingMention],
  );

  const handleCommentSubmit = async () => {
    if (!hasContent(newComment) && pendingFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      const commentText = getCommentText(newComment);
      // Use direct API call instead of server action
      await createCommentWithFiles(commentText, entityId, entityType, pendingFiles);

      toast.success('Comment added!');

      // Refresh comments via SWR
      refreshComments();

      // Reset form
      setNewComment(null);
      setPendingFiles([]);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10" onKeyDown={handleKeyDown}>
      <div className="flex items-start gap-3">
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          disabled={isSubmitting}
        />
        <div className="flex-1 space-y-2">
          <CommentRichTextField
            value={newComment}
            onChange={setNewComment}
            members={mentionMembers}
            disabled={isSubmitting}
            placeholder="Leave a comment (mention users with @)"
            onMentionSelect={() => setIsSelectingMention(true)}
          />

          {pendingFiles.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-sm group"
                  >
                    <Document size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[150px]" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemovePendingFile(index)}
                      disabled={isSubmitting}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Close size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-3 pb-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={triggerFileInput}
              disabled={isSubmitting}
              aria-label="Add attachment"
            >
              <Attachment />
            </Button>

            <Button
              variant="outline"
              onClick={handleCommentSubmit}
              disabled={isSubmitting || (!hasContent(newComment) && pendingFiles.length === 0)}
              loading={isSubmitting}
            >
              Comment
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showReminderDialog} onOpenChange={(open) => !open && handleReminderClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Screenshot Requirements</DialogTitle>
            <DialogDescription>
              Ensure your organisation name is clearly visible within the screenshot.
            </DialogDescription>
          </DialogHeader>
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
