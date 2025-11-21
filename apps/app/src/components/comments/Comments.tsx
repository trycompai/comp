'use client';

import { useComments } from '@/hooks/use-comments-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { CommentEntityType } from '@db';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

export type CommentWithAuthor = {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    deactivated: boolean;
  };
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    createdAt: string;
    // downloadUrl removed - now generated on-demand only
  }>;
  createdAt: string;
};

interface CommentsProps {
  entityId: string;
  entityType: CommentEntityType;
  /** Optional custom title for the comments section */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Whether to show as a card or just the content */
  variant?: 'card' | 'inline';
}

/**
 * Reusable Comments component that works with any entity type.
 * Automatically handles data fetching, real-time updates, loading states, and error handling.
 *
 * @example
 * // Basic usage
 * <Comments entityId={taskId} entityType="task" />
 *
 * @example
 * // Custom title and inline variant
 * <Comments
 *   entityId={riskId}
 *   entityType="risk"
 *   title="Risk Discussion"
 *   variant="inline"
 * />
 */
export const Comments = ({
  entityId,
  entityType,
  title = 'Comments',
  description,
  variant = 'card',
}: CommentsProps) => {
  // Use SWR hooks for real-time comment fetching
  const {
    data: commentsData,
    error: commentsError,
    isLoading: commentsLoading,
    mutate: refreshComments,
  } = useComments(entityId, entityType);

  // Extract comments from SWR response
  const comments = commentsData?.data || [];

  // Generate default description if not provided
  const defaultDescription = description || `Leave a comment on this ${entityType}`;

  const content = (
    <div className="space-y-4">
      <CommentForm entityId={entityId} entityType={entityType} />

      {commentsLoading && (
        <div className="space-y-3">
          {/* Enhanced comment skeletons */}
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card animate-pulse"
            >
              <div className="h-8 w-8 rounded-full bg-muted/50 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-24 bg-muted/50 rounded" />
                  <div className="h-3 w-16 bg-muted/30 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-muted/40 rounded" />
                  <div className="h-3 w-3/4 bg-muted/30 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {commentsError && (
        <div className="text-destructive text-sm">Failed to load comments. Please try again.</div>
      )}

      {!commentsLoading && !commentsError && (
        <CommentList comments={comments} refreshComments={refreshComments} />
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="space-y-4">
        {title && (
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{defaultDescription}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
