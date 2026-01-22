'use client';

import { useComments } from '@/hooks/use-comments-api';
import { CommentEntityType } from '@db';
import { Section, Stack, Text } from '@trycompai/design-system';
import { useParams } from 'next/navigation';
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
  }>;
  createdAt: string;
};

interface CommentsProps {
  entityId: string;
  entityType: CommentEntityType;
  /**
   * Optional organization ID override.
   * Best practice: omit this and let the component use `orgId` from URL params.
   */
  organizationId?: string;
  /** Optional custom title for the comments section */
  title?: string;
  /** Optional custom description */
  description?: string;
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
 * // Custom title
 * <Comments
 *   entityId={riskId}
 *   entityType="risk"
 *   title="Risk Discussion"
 * />
 */
export const Comments = ({
  entityId,
  entityType,
  organizationId,
  title = 'Comments',
  description,
}: CommentsProps) => {
  const params = useParams();
  const orgIdFromParams =
    typeof params?.orgId === 'string'
      ? params.orgId
      : Array.isArray(params?.orgId)
        ? params.orgId[0]
        : undefined;
  const resolvedOrgId = organizationId ?? orgIdFromParams;

  // Use SWR hooks for real-time comment fetching
  const {
    data: commentsData,
    error: commentsError,
    isLoading: commentsLoading,
    mutate: refreshComments,
  } = useComments(entityId, entityType, {
    organizationId: resolvedOrgId,
    enabled: Boolean(resolvedOrgId),
  });

  // Extract comments from SWR response
  const comments = commentsData?.data || [];

  return (
    <Section title={title} description={description}>
      <Stack gap="md">
        <CommentForm entityId={entityId} entityType={entityType} organizationId={resolvedOrgId} />

        {commentsLoading && (
          <Stack gap="sm">
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
          </Stack>
        )}

        {commentsError && (
          <Text size="sm" variant="destructive">
            Failed to load comments. Please try again.
          </Text>
        )}

        {!commentsLoading && !commentsError && (
          <CommentList comments={comments} refreshComments={refreshComments} />
        )}
      </Stack>
    </Section>
  );
};
