'use client';

import { deleteComment } from '@/actions/comments/deleteComment';
import { updateComment } from '@/actions/comments/updateComment';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
// Removed Label import - not needed for simplified comment editing
import { Textarea } from '@comp/ui/textarea';
// Removed AttachmentEntityType import - not needed for basic comment editing
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
// Removed useRouter since we're using SWR for data refresh
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
// Removed AttachmentItem import - simplified comment editing
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils'; // Revert import path
import type { CommentWithAuthor } from './Comments';

// Removed PendingAttachment type - simplified comment editing

export function CommentItem({
  comment,
  refreshComments,
}: {
  comment: CommentWithAuthor;
  refreshComments: () => void;
}) {
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

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  // Server actions will handle revalidation automatically via safe-action middleware

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
      setIsEditing(false); // Exit edit mode if no changes
      return;
    }

    try {
      // Use server action for comment update
      const result = await updateComment({
        commentId: comment.id,
        content: editedContent,
      });

      if (result?.data?.success) {
        toast.success('Comment updated successfully.');
        refreshComments();
        setIsEditing(false);
      } else {
        throw new Error('Failed to update comment');
      }
    } catch (error) {
      toast.error('Failed to save comment changes.');
      console.error('Save changes error:', error);
    }
  };

  const handleDeleteComment = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const result = await deleteComment({
          commentId: comment.id,
        });

        if (result?.data?.success) {
          toast.success('Comment deleted successfully.');
          refreshComments();
        } else {
          throw new Error('Failed to delete comment');
        }
      } catch (error) {
        toast.error('Failed to delete comment.');
        console.error('Delete comment error:', error);
      }
    }
  };

  // Simplified comment editing - attachment functionality removed for now

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

            {/* Show existing attachments (read-only for now) */}
            {comment.attachments.length > 0 && (
              <div className="pt-3">
                <div className="text-xs text-muted-foreground mb-2">Attachments:</div>
                <div className="space-y-1">
                  {comment.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 text-xs">
                      <span>📎</span>
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {att.name}
                      </span>
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
    </Card>
  );
}
