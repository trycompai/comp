'use client';

import { deleteComment } from '@/actions/comments/deleteComment';
import { deleteCommentAttachment } from '@/actions/comments/deleteCommentAttachment';
import { getCommentAttachmentUrl } from '@/actions/comments/getCommentAttachmentUrl'; // Import action
import { updateComment } from '@/actions/comments/updateComment';
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
import { AttachmentEntityType } from '@db'; // Import AttachmentEntityType
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
import { AttachmentItem } from '../../app/(app)/[orgId]/tasks/[taskId]/components/AttachmentItem';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils'; // Revert import path
import type { CommentWithAuthor } from './Comments';

type PendingAttachment = {
  id: string;
  name: string;
  fileType: string;
  signedUrl: string;
};

function renderContentWithLinks(text: string): React.ReactNode[] {
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?<!@)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  return text.split(regex).map((part, index) => {
    if (/^(https?:\/\/[^\s]+|www\.[^\s]+|(?<!@)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)$/i.test(part)) {
      const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [currentAttachments, setCurrentAttachments] = useState([...comment.attachments]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<string[]>([]);
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

    try {
      if (attachmentsToRemove.length > 0) {
        await Promise.all(
          attachmentsToRemove.map((attachmentId) => deleteCommentAttachment({ attachmentId })),
        );
      }

      await updateComment({
        commentId: comment.id,
        content: contentChanged ? editedContent : undefined,
        attachmentIdsToAdd: attachmentsAdded ? pendingAttachmentsToAdd.map((a) => a.id) : undefined,
      });

      toast.success('Comment updated successfully.');
      router.refresh();
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save comment changes.');
      console.error('Save changes error:', error);
    }
  };

  const handleDeleteComment = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await deleteComment({ commentId: comment.id });
      router.refresh();
    }
  };

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
            return resolve(null);
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string)?.split(',')[1];
              if (!base64Data) {
                throw new Error('Failed to read file data.');
              }
              const result = await uploadFile({
                fileName: file.name,
                fileType: file.type,
                fileData: base64Data,
                entityId: comment.id,
                entityType: AttachmentEntityType.comment,
              });

              if (result.success && result.data) {
                setPendingAttachmentsToAdd((prev) => [
                  ...prev,
                  {
                    id: result.data.id,
                    name: result.data.name,
                    fileType: result.data.type,
                    signedUrl: result.data.signedUrl,
                  },
                ]);
                toast.success(`File "${result.data.name}" ready for attachment.`);
              } else {
                throw new Error(result.error);
              }
              resolve(result);
            } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              toast.error(`Failed to upload ${file.name}.`);
              resolve(null);
            }
          };
          reader.onerror = () => {
            toast.error(`Error reading file "${file.name}".`);
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      });

      await Promise.all(uploadPromises);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [comment.id],
  );

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

  const handlePendingAttachmentClick = (attachmentId: string) => {
    const pendingAttachment = pendingAttachmentsToAdd.find((att) => att.id === attachmentId);
    if (pendingAttachment?.signedUrl) {
      window.open(pendingAttachment.signedUrl, '_blank');
    } else {
      toast.error('Preview URL not available for this pending attachment.');
    }
  };

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
              <p className="whitespace-pre-wrap break-words">
                {renderContentWithLinks(comment.content)}
              </p>
            ) : (
              <Textarea
                value={editedContent}
                onChange={(e: { target: { value: React.SetStateAction<string> } }) =>
                  setEditedContent(e.target.value)
                }
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
                      <div className="flex flex-wrap gap-2">
                        {pendingAttachmentsToAdd.map((att: PendingAttachment) => (
                          <AttachmentItem
                            key={att.id}
                            pendingAttachment={att}
                            onClickFilename={handlePendingAttachmentClick}
                            onDelete={handleRemovePendingAttachment}
                            isParentBusy={isUploading}
                            canDelete={true}
                          />
                        ))}
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

            {isEditing && (
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isUploading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isUploading}>
                  {isUploading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
