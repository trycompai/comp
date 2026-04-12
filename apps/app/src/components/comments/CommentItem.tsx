'use client';

import { useApi } from '@/hooks/use-api';
import { useCommentActions } from '@/hooks/use-comments-api';
import { useMentionableMembers } from '@/hooks/use-mentionable-members';
import type { JSONContent } from '@tiptap/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  Text,
} from '@trycompai/design-system';
import {
  Document,
  OverflowMenuVertical,
  TrashCan,
  WarningAlt,
} from '@trycompai/design-system/icons';
import { Edit } from '@carbon/icons-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils';
import { CommentContentView } from './CommentContentView';
import { CommentRichTextField } from './CommentRichTextField';
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

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0]?.toUpperCase() ?? '?';
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
  readOnly?: boolean;
  entityType: string;
}

export function CommentItem({ comment, refreshComments, readOnly = false, entityType }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<JSONContent | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use API hooks instead of server actions
  const { updateComment, deleteComment } = useCommentActions();
  const { get: apiGet } = useApi();
  const { members: mentionMembers } = useMentionableMembers(entityType);

  // Parse comment content to JSONContent
  const parseContent = (content: string): JSONContent | null => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        return parsed as JSONContent;
      }
    } catch {
      // Not JSON, return null
    }
    return null;
  };

  // Convert JSONContent to string for API
  const contentToString = (content: JSONContent | null): string => {
    if (!content) return '';
    return JSON.stringify(content);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Parse existing content or create empty content
      const parsed = parseContent(comment.content);
      setEditedContent(parsed);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentString = contentToString(editedContent);
    const contentChanged = contentString !== comment.content;

    if (!contentChanged) {
      toast.info('No changes detected.');
      setIsEditing(false);
      return;
    }

    try {
      // Use API hook directly instead of server action
      await updateComment(comment.id, { content: contentString });

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
      <div className="flex items-start gap-3 py-2 group">
        <div className="relative shrink-0">
          {comment.isSystemGenerated ? (
            <Avatar size="sm">
              <AvatarImage src="/compailogo.jpg" alt="Comp AI" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
          ) : (
            <>
              <Avatar size="sm">
                <AvatarImage
                  src={comment.author.image || getGravatarUrl(comment.author.email)}
                  alt={comment.author.name ?? 'User'}
                />
                <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
              </Avatar>
              {comment.author.deactivated && (
                <div className="absolute -bottom-0.5 -right-0.5">
                  <WarningAlt size={12} className="text-destructive" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div className="flex items-center justify-between gap-2">
            <HStack gap="xs" align="center">
              <Text size="sm" weight="medium">
                {comment.isSystemGenerated ? 'Comp AI' : (comment.author.name ?? 'Unknown User')}
              </Text>
              <Text size="xs" variant="muted">
                {!isEditing ? formatRelativeTime(comment.createdAt) : 'Editing...'}
              </Text>
            </HStack>
            {!isEditing && !readOnly && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger variant="ellipsis">
                    <OverflowMenuVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditToggle}>
                      <Edit size={16} />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      <TrashCan size={16} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            </div>

            {!isEditing ? (
              <CommentContentView content={comment.content} />
            ) : (
              <CommentRichTextField
                value={editedContent}
                onChange={setEditedContent}
                members={mentionMembers}
                disabled={false}
                placeholder="Edit comment..."
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
                        <Document size={14} className={getFileIconColor()} />
                        <span className="hover:underline max-w-[200px] truncate">{att.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isEditing && (
              <HStack justify="end" gap="xs">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
              </HStack>
            )}
          </div>
      </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteComment}
              loading={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
