'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import type { AttachmentType } from '@db';
import { useCallback } from 'react';

// Types for attachments API
// Note: API returns dates as ISO strings, not Date objects
export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  createdAt: string; // ISO string from API
  updatedAt: string; // ISO string from API
  entityId: string;
  entityType: string;
  organizationId: string;
  commentId: string | null;
  description: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  organizationId: string;
  createdAt: string; // ISO string from API
  updatedAt: string; // ISO string from API
}

export interface Comment {
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
    createdAt: string; // ISO string from API
  }>;
  createdAt: string; // ISO string from API
}

/**
 * Hook to fetch all tasks using SWR
 */
export function useTasks(options: UseApiSWROptions<Task[]> = {}) {
  return useApiSWR<Task[]>('/v1/tasks', options);
}

/**
 * Hook to fetch a single task using SWR
 */
export function useTask(taskId: string | null, options: UseApiSWROptions<Task> = {}) {
  return useApiSWR<Task>(taskId ? `/v1/tasks/${taskId}` : null, options);
}

/**
 * Hook to fetch task attachments using SWR
 */
export function useTaskAttachments(
  taskId: string | null,
  options: UseApiSWROptions<Attachment[]> = {},
) {
  return useApiSWR<Attachment[]>(taskId ? `/v1/tasks/${taskId}/attachments` : null, options);
}

/**
 * Hook for task attachment actions (upload, download, delete)
 */
export function useTaskAttachmentActions(taskId: string) {
  const api = useApi();

  const uploadAttachment = useCallback(
    (file: File): Promise<Attachment> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1]; // Remove data:image/...;base64, prefix

            const response = await api.post<Attachment>(`/v1/tasks/${taskId}/attachments`, {
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileData: base64Data,
            });

            if (response.error) {
              throw new Error(response.error);
            }

            resolve(response.data!);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    [api, taskId],
  );

  const getDownloadUrl = useCallback(
    async (attachmentId: string) => {
      const response = await api.get<{ downloadUrl: string }>(
        `/v1/tasks/${taskId}/attachments/${attachmentId}/download`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!.downloadUrl;
    },
    [api, taskId],
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      const response = await api.delete(`/v1/tasks/${taskId}/attachments/${attachmentId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      // DELETE returns 204 No Content - success if no error
      return { success: true, status: response.status };
    },
    [api, taskId],
  );

  return {
    uploadAttachment,
    getDownloadUrl,
    deleteAttachment,
  };
}

/**
 * Enhanced hooks with optimistic updates following official SWR patterns
 */
export function useOptimisticTaskAttachments(taskId: string) {
  const { data, error, isLoading, mutate } = useTaskAttachments(taskId);
  const { uploadAttachment, deleteAttachment } = useTaskAttachmentActions(taskId);

  const optimisticUpload = useCallback(
    async (file: File) => {
      // Create optimistic attachment data
      const optimisticAttachment: Attachment = {
        id: `temp-${Date.now()}`,
        name: file.name,
        type: file.type as any,
        url: '',
        entityId: taskId,
        entityType: 'task' as any,
        organizationId: '',
        commentId: null,
        description: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return mutate(
        async () => {
          const result = await uploadAttachment(file);
          return { data: [result], status: 200 }; // Wrap in expected API response format
        },
        {
          optimisticData: data ? {
            ...data,
            data: [...(data.data || []), optimisticAttachment]
          } : undefined,
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        }
      );
    },
    [mutate, uploadAttachment, data, taskId],
  );

  const optimisticDelete = useCallback(
    async (attachmentId: string) => {
      return mutate(
        async () => {
          await deleteAttachment(attachmentId);
          return data; // Return current data without the deleted item
        },
        {
          optimisticData: data ? {
            ...data,
            data: (data.data || []).filter(att => att.id !== attachmentId)
          } : undefined,
          populateCache: false,
          revalidate: false,
          rollbackOnError: true,
        }
      );
    },
    [mutate, deleteAttachment, data],
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    optimisticUpload,
    optimisticDelete,
  };
}

/**
 * Legacy task comment hooks (deprecated - use generic comment hooks instead)
 * @deprecated Use useComments from '@/hooks/use-comments-api' instead
 */
export function useTaskComments(taskId: string | null, options: UseApiSWROptions<Comment[]> = {}) {
  return useApiSWR<Comment[]>(taskId ? `/v1/tasks/${taskId}/comments` : null, options);
}

/**
 * @deprecated Use useCommentActions from '@/hooks/use-comments-api' instead
 */
export function useTaskCommentActions(taskId: string) {
  const api = useApi();

  const createComment = useCallback(
    async (data: { content: string }) => {
      const response = await api.post<Comment>(`/v1/tasks/${taskId}/comments`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api, taskId],
  );

  const updateComment = useCallback(
    async (commentId: string, data: { content: string }) => {
      const response = await api.put<Comment>(`/v1/tasks/${taskId}/comments/${commentId}`, {
        content: data.content,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api, taskId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const response = await api.delete(`/v1/tasks/${taskId}/comments/${commentId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    [api, taskId],
  );

  return {
    createComment,
    updateComment,
    deleteComment,
  };
}
