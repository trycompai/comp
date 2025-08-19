'use client';

import { useApi } from '@/hooks/use-api';
import { useCommentActions } from '@/hooks/use-comments-api';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Textarea } from '@comp/ui/textarea';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils';
import type { CommentWithAuthor } from './Comments';

// Helper function to render content with clickable links
function renderContentWithLinks(text: string): React.ReactNode[] {
  const regex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|(?<!@)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  return text.split(regex).map((part, index) => {
    if (
      /^(https?:\/\/[^\s]+|www\.[^\s]+|(?<!@)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)$/i.test(
        part,
      )
    ) {
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

interface CommentItemProps {
  comment: CommentWithAuthor;
  refreshComments: () => void;
}

export function CommentItem({ comment, refreshComments }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use API hooks instead of server actions
  const { updateComment, deleteComment } = useCommentActions();
  const { get: apiGet } = useApi();

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedContent(comment.content);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentChanged = editedContent !== comment.content;

    if (!contentChanged) {
      toast.info('No changes detected.');
      setIsEditing(false);
      return;
    }

    try {
      // Use API hook directly instead of server action
      await updateComment(comment.id, { content: editedContent });

      toast.success('Comment updated successfully.');
      refreshComments();
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save comment changes.');
      console.error('Save changes error:', error);
    }
  };

  const handleDeleteComment = async () => {
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      toast.success('Comment deleted successfully.');
      refreshComments();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete comment.');
      console.error('Delete comment error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAttachmentClick = async (attachmentId: string, fileName: string) => {
    try {
      // Generate fresh download URL on-demand using the useApi hook (with org context)
      const response = await apiGet<{ downloadUrl: string; expiresIn: number }>(
        `/v1/attachments/${attachmentId}/download`,
      );

      if (response.error || !response.data?.downloadUrl) {
        console.error('API Error Details:', {
          status: response.status,
          error: response.error,
          data: response.data,
        });
        throw new Error(response.error || 'API response missing downloadUrl');
      }

      // Open the fresh URL in a new tab
      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading attachment:', error);

      // Since we no longer pre-generate URLs, show user error when API fails
      console.error('No fallback available - URLs are only generated on-demand');
      toast.error(`Failed to download ${fileName}`);
    }
  };

  return (
    <Card className="bg-foreground/5 rounded-lg">
      <CardContent className="text-foreground flex items-start gap-3 p-4">
        <Avatar className="h-6 w-6">
          <AvatarImage src={undefined} alt={comment.author.name ?? 'User'} />
          <AvatarFallback>{comment.author.name?.charAt(0).toUpperCase() ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 items-start space-y-2 text-sm">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="leading-none font-medium">
                  {comment.author.name ?? 'Unknown User'}
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
                      onSelect={() => setIsDeleteOpen(true)}
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

            {/* Show existing attachments (read-only for now) */}
            {comment.attachments.length > 0 && (
              <div className="pt-3">
                <div className="text-xs text-muted-foreground mb-2">Attachments:</div>
                <div className="space-y-1">
                  {comment.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 text-xs">
                      <span>📎</span>
                      <button
                        onClick={() => handleAttachmentClick(att.id, att.name)}
                        className="text-blue-600 hover:underline cursor-pointer text-left"
                      >
                        {att.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteComment} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
