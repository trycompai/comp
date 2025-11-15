'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import type { CommentEntityType } from '@db';
import { useCallback } from 'react';

// Helper function to convert API date strings to Date objects
export function parseApiDate(dateString: string): Date {
  return new Date(dateString);
}

// Types for the new generic comments API
// Note: API returns dates as ISO strings, not Date objects
export interface Comment {
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
    downloadUrl: string;
    createdAt: string; // ISO string from API
  }>;
  createdAt: string; // ISO string from API
}

interface CreateCommentData {
  content: string;
  entityId: string;
  entityType: CommentEntityType;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileData: string; // base64
  }>;
}

interface UpdateCommentData {
  content: string;
}

/**
 * Generic hook to fetch comments for any entity using SWR
 */
export function useComments(
  entityId: string | null,
  entityType: CommentEntityType | null,
  options: UseApiSWROptions<Comment[]> = {},
) {
  const endpoint =
    entityId && entityType ? `/v1/comments?entityId=${entityId}&entityType=${entityType}` : null;

  return useApiSWR<Comment[]>(endpoint, options);
}

/**
 * Generic hook for comment CRUD operations
 */
export function useCommentActions() {
  const api = useApi();

  const createComment = useCallback(
    async (data: CreateCommentData) => {
      const response = await api.post<Comment>('/v1/comments', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const updateComment = useCallback(
    async (commentId: string, data: UpdateCommentData) => {
      const response = await api.put<Comment>(`/v1/comments/${commentId}`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const response = await api.delete(`/v1/comments/${commentId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      // DELETE returns 204 No Content - success if no error
      return { success: true, status: response.status };
    },
    [api],
  );

  return {
    createComment,
    updateComment,
    deleteComment,
  };
}

/**
 * Utility hook that combines file handling with comment creation
 */
export function useCommentWithAttachments() {
  const { createComment } = useCommentActions();

  const createCommentWithFiles = useCallback(
    async (content: string, entityId: string, entityType: CommentEntityType, files: File[]) => {
      const attachments = await Promise.all(
        files.map((file) => {
          return new Promise<{ fileName: string; fileType: string; fileData: string }>(
            (resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = (reader.result as string)?.split(',')[1];
                if (!base64Data) {
                  reject(new Error('Failed to read file data'));
                } else {
                  resolve({
                    fileName: file.name,
                    fileType: file.type,
                    fileData: base64Data,
                  });
                }
              };
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            },
          );
        }),
      );

      return createComment({
        content,
        entityId,
        entityType,
        attachments,
      });
    },
    [createComment],
  );

  return {
    createCommentWithFiles,
  };
}

/**
 * Enhanced hooks with optimistic updates following official SWR patterns
 */
export function useOptimisticComments(entityId: string, entityType: CommentEntityType) {
  const { data, error, isLoading, mutate } = useComments(entityId, entityType);
  const { createComment, updateComment, deleteComment } = useCommentActions();

  const optimisticCreate = useCallback(
    async (
      content: string,
      attachments?: { fileName: string; fileType: string; fileData: string }[],
    ) => {
      // Create optimistic comment matching Comment type structure
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content,
        author: {
          id: 'temp-user',
          name: 'You', // Will be replaced with real author data
          email: '',
          image: null,
          deactivated: false,
        },
        attachments: [], // Will be populated by real response
        createdAt: new Date().toISOString(),
      };

      return mutate(
        async () => {
          // Call the API and transform single item response to array format for SWR cache
          const newComment = await createComment({ content, entityId, entityType, attachments });
          const currentComments = data?.data || [];

          // Replace optimistic comment with real one, or add if not found
          const optimisticIndex = currentComments.findIndex(
            (comment) => comment.id === optimisticComment.id,
          );
          const updatedComments =
            optimisticIndex >= 0
              ? currentComments.map((comment) =>
                  comment.id === optimisticComment.id ? newComment : comment,
                )
              : [newComment, ...currentComments]; // Add to beginning (newest first)

          return {
            data: updatedComments,
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: [optimisticComment, ...(data.data || [])], // Add to beginning (newest first)
              }
            : { data: [optimisticComment], status: 200 },
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );
    },
    [mutate, createComment, data, entityId, entityType],
  );

  const optimisticUpdate = useCallback(
    async (commentId: string, content: string) => {
      return mutate(
        async () => {
          // Call the API and transform response to array format for SWR cache
          const updatedComment = await updateComment(commentId, { content });
          const currentComments = data?.data || [];

          // Replace updated comment with real one
          const updatedComments = currentComments.map((comment: any) =>
            comment.id === commentId ? updatedComment : comment,
          );

          return {
            data: updatedComments,
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: (data.data || []).map((comment: any) =>
                  comment.id === commentId ? { ...comment, content } : comment,
                ),
              }
            : undefined,
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );
    },
    [mutate, updateComment, data],
  );

  const optimisticDelete = useCallback(
    async (commentId: string) => {
      return mutate(
        async () => {
          // Call the API and return updated cache data
          await deleteComment(commentId);
          const updatedComments = (data?.data || []).filter(
            (comment: any) => comment.id !== commentId,
          );

          return {
            data: updatedComments,
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: (data.data || []).filter((comment: any) => comment.id !== commentId),
              }
            : undefined,
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );
    },
    [mutate, deleteComment, data],
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
  };
}

// ==================== ENTITY-SPECIFIC CONVENIENCE HOOKS ====================

/**
 * Convenience hook for task comments
 */
export function useTaskComments(taskId: string | null, options: UseApiSWROptions<Comment[]> = {}) {
  return useComments(taskId, 'task', options);
}

/**
 * Convenience hook for policy comments
 */
export function usePolicyComments(
  policyId: string | null,
  options: UseApiSWROptions<Comment[]> = {},
) {
  return useComments(policyId, 'policy', options);
}

/**
 * Convenience hook for vendor comments
 */
export function useVendorComments(
  vendorId: string | null,
  options: UseApiSWROptions<Comment[]> = {},
) {
  return useComments(vendorId, 'vendor', options);
}

/**
 * Convenience hook for risk comments
 */
export function useRiskComments(riskId: string | null, options: UseApiSWROptions<Comment[]> = {}) {
  return useComments(riskId, 'risk', options);
}

/**
 * Example usage:
 *
 * ```typescript
 * function TaskComments({ taskId }: { taskId: string }) {
 *   const { data: comments, error, isLoading, mutate } = useTaskComments(taskId);
 *   const { createCommentWithFiles } = useCommentWithAttachments();
 *
 *   const handleSubmit = async (content: string, files: File[]) => {
 *     await createCommentWithFiles(content, taskId, 'task', files);
 *     mutate(); // Refresh comments
 *   };
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error || comments?.error) return <div>Error loading comments</div>;
 *
 *   return (
 *     <div>
 *       {comments?.data?.map(comment => (
 *         <div key={comment.id}>{comment.content}</div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * // For other entities:
 * function PolicyComments({ policyId }: { policyId: string }) {
 *   const { data: comments } = usePolicyComments(policyId);
 *   const { createCommentWithFiles } = useCommentWithAttachments();
 *
 *   const handleSubmit = async (content: string, files: File[]) => {
 *     await createCommentWithFiles(content, policyId, 'policy', files);
 *   };
 *
 *   // ... component implementation
 * }
 * ```
 */
