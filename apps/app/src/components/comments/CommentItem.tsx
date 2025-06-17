'use client';

import { uploadFile } from '@/actions/files/upload-file';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import {
  Loader2, // Import Loader2
  MoreHorizontal, // Import Paperclip
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteComment } from '@/actions/comments/deleteComment';
import { deleteCommentAttachment } from '@/actions/comments/deleteCommentAttachment';
import { getCommentAttachmentUrl } from '@/actions/comments/getCommentAttachmentUrl'; // Import action
import { updateComment } from '@/actions/comments/updateComment';
import { AttachmentItem } from '../../app/(app)/[orgId]/tasks/[taskId]/components/AttachmentItem';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils'; // Revert import path
import { AttachmentEntityType } from '@comp/db/types'; // Import AttachmentEntityType
import type { AttachmentType } from '@comp/db/types';
import type { CommentWithAuthor } from './Comments';

// Local helper to map fileType to AttachmentType
function mapFileTypeToAttachmentType(fileType: string): AttachmentType {
  const type = fileType.split('/')[0];
  switch (type) {
    case 'image':
      return 'image' as AttachmentType;
    case 'video':
      return 'video' as AttachmentType;
    case 'audio':
      return 'audio' as AttachmentType;
    case 'application':
      if (fileType === 'application/pdf') return 'document' as AttachmentType;
      return 'document' as AttachmentType;
    default:
      return 'other' as AttachmentType;
  }
}

export function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [currentAttachments, setCurrentAttachments] = useState(
    [...comment.attachments], // Create a mutable copy
  );
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<string[]>([]);
  // Minimal type for pending attachments during editing.
  type PendingAttachment = {
    id: string;
    name: string;
    fileType: string;
    signedUrl: string;
  };
  // Store pending attachments including fileType and signedUrl
  const [pendingAttachmentsToAdd, setPendingAttachmentsToAdd] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<string[]>([]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedContent(comment.content);
      setCurrentAttachments(comment.attachments); // Reset from original comment
      setAttachmentsToRemove([]);
      setPendingAttachmentsToAdd([]);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentChanged = editedContent !== comment.content;
    const attachmentsAdded = pendingAttachmentsToAdd.length > 0;
    const attachmentsRemoved = attachmentsToRemove.length > 0;

    if (!contentChanged && !attachmentsAdded && !attachmentsRemoved) {
      toast.info('No changes detected.');
      setIsEditing(false); // Exit edit mode if no changes
      return;
    }

    // Call the update action
    try {
      // --- Deletion Phase ---
      // Call the delete action for all attachments marked for removal
      if (attachmentsToRemove.length > 0) {
        await Promise.all(
          attachmentsToRemove.map((attachmentId) => deleteCommentAttachment({ attachmentId })),
        );
        // Optionally: Add error handling for individual deletions if needed
      }

      // --- Update Phase ---
      const { success, error } = await updateComment({
        commentId: comment.id,
        content: contentChanged ? editedContent : undefined,
        attachmentIdsToAdd: attachmentsAdded ? pendingAttachmentsToAdd.map((a) => a.id) : undefined,
        attachmentIdsToRemove: attachmentsRemoved ? attachmentsToRemove : undefined,
      });

      if (success) {
        toast.success('Comment updated successfully.');

        // Optimistically add new attachments to currentAttachments for immediate UI update
        setCurrentAttachments((prev) => [
          // Remove attachments marked for removal
          ...prev.filter((att) => !attachmentsToRemove.includes(att.id)),
          // Add new attachments (promote PendingAttachment to minimal Attachment shape)
          ...pendingAttachmentsToAdd.map((pending) => ({
            id: pending.id,
            name: pending.name,
            fileType: pending.fileType,
            url: pending.signedUrl, // Use signedUrl as url for now
            type: mapFileTypeToAttachmentType(pending.fileType),
            entityId: comment.entityId,
            entityType: AttachmentEntityType.comment,
            createdAt: new Date(),
            updatedAt: new Date(),
            organizationId: comment.organizationId,
            commentId: comment.id,
          })),
        ]);

        setEditedContent(contentChanged ? editedContent : comment.content);
        setPendingAttachmentsToAdd([]);
        setAttachmentsToRemove([]);
        router.refresh();
      } else {
        toast.error(String(error || 'Failed to update comment.'));
      }
    } catch (error) {
      toast.error('Failed to save comment changes.');
      console.error('Save changes error:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteComment = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      console.log('Deleting comment:', comment.id);
      await deleteComment({ commentId: comment.id });
      router.refresh();
    }
  };

  // Handler for AttachmentItem to mark for removal
  const handleMarkForRemoval = (attachmentId: string) => {
    setAttachmentsToRemove((prev) => [...prev, attachmentId]);
    setCurrentAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
  };

  const deleteAttachmentAction = async (input: { attachmentId: string }) => {
    setDeletingAttachmentIds((prev) => [...prev, input.attachmentId]);
    try {
      handleMarkForRemoval(input.attachmentId);
      await deleteCommentAttachment({
        attachmentId: input.attachmentId,
      });
    } finally {
      setDeletingAttachmentIds((prev) => prev.filter((id) => id !== input.attachmentId));
    }
  };

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
              entityId: comment.entityId,
              entityType: 'comment',
            });
            if (error) {
              console.error('Upload file action error occurred:', error);
              toast.error(`Failed to upload "${file.name}": ${error}`);
            } else if (success && data?.id && data.signedUrl) {
              setPendingAttachmentsToAdd((prev) => [
                ...prev,
                {
                  id: data?.id ?? '',
                  name: data?.name ?? '',
                  fileType: file.type,
                  signedUrl: data.signedUrl,
                } as PendingAttachment,
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
    [comment.entityId],
  );

  const isProcessing = isUploading;

  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);

  const handleDownloadClick = async (attachmentId: string) => {
    setBusyAttachmentId(attachmentId);
    try {
      const { success, data, error } = await getCommentAttachmentUrl({
        attachmentId,
      });
      if (success && data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error(String(error || 'Failed to get attachment URL.'));
      }
    } catch (err) {
      toast.error('An unexpected error occurred while fetching the attachment.');
      console.error(err);
    } finally {
      setBusyAttachmentId(null);
    }
  };

  // Handler to open pre-signed URL for PENDING attachments (already available)
  const handlePendingAttachmentClick = (attachmentId: string) => {
    const pendingAttachment = pendingAttachmentsToAdd.find((att) => att.id === attachmentId);
    if (pendingAttachment?.signedUrl) {
      // Use signedUrl
      window.open(pendingAttachment.signedUrl, '_blank'); // Use signedUrl
    } else {
      toast.error('Preview URL not available for this pending attachment.');
      console.warn('Could not find pending attachment or signedUrl for ID:', attachmentId); // Use signedUrl
    }
  };

  // Handler to remove a PENDING attachment from the list before saving
  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachmentsToAdd((prev) => prev.filter((att) => att.id !== attachmentId));
  };

  return (
    <Card className="bg-foreground/5 rounded-lg">
      <CardContent className="text-foreground flex items-start gap-3 p-4">
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={comment.author.user?.image ?? undefined}
            alt={comment.author.user?.name ?? 'User'}
          />
          <AvatarFallback>
            {comment.author.user?.name?.charAt(0).toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 items-start space-y-2 text-sm">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="leading-none font-medium">
                  {comment.author.user?.name ?? 'Unknown User'}
                </span>
                <span className="text-muted-foreground text-xs">
                  {!isEditing ? formatRelativeTime(comment.createdAt) : 'Editing...'}
                </span>
              </div>
              {!isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleEditToggle}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={handleDeleteComment}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {!isEditing ? (
              <p className="whitespace-pre-wrap">{comment.content}</p>
            ) : (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="bg-background/50 min-h-[60px] text-sm"
                placeholder="Edit comment..."
              />
            )}

            {(currentAttachments.length > 0 || pendingAttachmentsToAdd.length > 0 || isEditing) && (
              <div className="pt-6">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Label className="block text-xs font-medium">Attachments</Label>
                    <div className="flex flex-col gap-2">
                      {/* Combined attachments row */}
                      <div className="flex flex-wrap gap-2">
                        {/* Pending attachments first */}
                        {pendingAttachmentsToAdd.map((att: PendingAttachment) => (
                          <AttachmentItem
                            key={att.id}
                            pendingAttachment={att}
                            onClickFilename={handlePendingAttachmentClick}
                            onDelete={handleRemovePendingAttachment}
                            isParentBusy={isProcessing}
                            canDelete={true}
                          />
                        ))}
                        {/* Existing attachments second */}
                        {currentAttachments.map((att) => (
                          <AttachmentItem
                            key={att.id}
                            attachment={{
                              ...att,
                            }}
                            onDelete={() =>
                              deleteAttachmentAction({
                                attachmentId: att.id,
                              })
                            }
                            onClickFilename={handleDownloadClick}
                            isBusy={deletingAttachmentIds.includes(att.id)}
                            canDelete={isEditing}
                          />
                        ))}
                      </div>
                      <div>
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={triggerFileInput}
                          disabled={isUploading}
                          className="bg-foreground/5 flex items-center gap-1"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add Attachment
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display mode: only show attachments if not editing
                  <div className="flex flex-wrap gap-2">
                    {currentAttachments.map((att) => (
                      <AttachmentItem
                        key={att.id}
                        attachment={att}
                        onDelete={() =>
                          deleteAttachmentAction({
                            attachmentId: att.id,
                          })
                        }
                        onClickFilename={handleDownloadClick}
                        isBusy={deletingAttachmentIds.includes(att.id)}
                        canDelete={isEditing}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isProcessing} // Disable only when saving
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isProcessing}>
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
