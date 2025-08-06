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
  };
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    downloadUrl: string;
    createdAt: string;
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
          {/* Simple comment skeletons */}
          {[1, 2].map((i) => (
            <div key={i} className="bg-muted/20 rounded-lg h-16 animate-pulse"></div>
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
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
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
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};
