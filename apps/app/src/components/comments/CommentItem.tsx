'use client';

import { useApi } from '@/hooks/use-api';
import { useCommentActions } from '@/hooks/use-comments-api';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Button } from '@comp/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@comp/ui/tooltip';
import {
  AlertTriangle,
  FileIcon,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils';
import type { CommentWithAuthor } from './Comments';

// Helper function to generate gravatar URL
function getGravatarUrl(email: string | null | undefined, size = 64): string {
  if (!email)
    return `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&s=${size}`;

  // Simple MD5 hash implementation for gravatar
  // In production, you might want to use a proper library or server-side generation
  const emailHash = email.toLowerCase().trim();
  // For now, we'll use the email as a placeholder - ideally this should be MD5 hashed
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailHash)}&size=${size}`;
}

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
    <>
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all group">
        <div className="relative">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage
              src={comment.author.image || getGravatarUrl(comment.author.email)}
              alt={comment.author.name ?? 'User'}
            />
            <AvatarFallback className="text-xs bg-muted">
              {comment.author.name?.charAt(0).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          {comment.author.deactivated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 fill-yellow-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This user is deactivated.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
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
                className="bg-muted/50 border-border min-h-[80px] text-sm resize-none"
                placeholder="Edit comment..."
                autoFocus
              />
            )}

            {/* Show existing attachments */}
            {comment.attachments.length > 0 && (
              <div className="pt-3 mt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-2">
                  {comment.attachments.map((att) => {
                    const fileExt = att.name.split('.').pop()?.toLowerCase() || '';
                    const isPDF = fileExt === 'pdf';
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                    const isDoc = ['doc', 'docx'].includes(fileExt);

                    const getFileTypeStyles = () => {
                      if (isPDF || isImage || isDoc)
                        return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                      return 'bg-muted/50 border-border hover:bg-muted/70';
                    };

                    const getFileIconColor = () => {
                      if (isPDF || isImage || isDoc) return 'text-primary';
                      return 'text-muted-foreground';
                    };

                    return (
                      <button
                        key={att.id}
                        onClick={() => handleAttachmentClick(att.id, att.name)}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 border rounded-md transition-all text-sm ${getFileTypeStyles()}`}
                        title={att.name}
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
                        <span className="hover:underline max-w-[200px] truncate">{att.name}</span>
                      </button>
                    );
                  })}
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
      </div>
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
    </>
  );
}
