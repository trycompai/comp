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
      return response;
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
