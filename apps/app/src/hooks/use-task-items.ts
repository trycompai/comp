'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { useCallback } from 'react';

export type TaskItemEntityType = 'vendor' | 'risk' | 'policy' | 'control';

export type TaskItemStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';

export type TaskItemPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskItemStatus;
  priority: TaskItemPriority;
  entityId: string;
  entityType: TaskItemEntityType;
  assignee: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  } | null;
  createdBy: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  };
  updatedBy: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItemsStats {
  total: number;
  byStatus: {
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    canceled: number;
  };
}

export interface PaginatedTaskItemsResponse {
  data: TaskItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface CreateTaskItemData {
  title: string;
  description?: string;
  status?: TaskItemStatus;
  priority?: TaskItemPriority;
  entityId: string;
  entityType: TaskItemEntityType;
  assigneeId?: string;
}

interface UpdateTaskItemData {
  title?: string;
  description?: string;
  status?: TaskItemStatus;
  priority?: TaskItemPriority;
  assigneeId?: string | null;
}

export type TaskItemSortBy = 'createdAt' | 'updatedAt' | 'title' | 'status' | 'priority';
export type TaskItemSortOrder = 'asc' | 'desc';

export interface TaskItemFilters {
  status?: TaskItemStatus;
  priority?: TaskItemPriority;
  assigneeId?: string | null;
}

/**
 * Hook to fetch task items for any entity using SWR with pagination, filtering, and sorting
 * Universal hook that works with any entityType (vendor, risk, policy, control)
 */
export function useTaskItems(
  entityId: string | null,
  entityType: TaskItemEntityType | null,
  page: number = 1,
  limit: number = 5,
  sortBy: TaskItemSortBy = 'createdAt',
  sortOrder: TaskItemSortOrder = 'desc',
  filters: TaskItemFilters = {},
  options: UseApiSWROptions<PaginatedTaskItemsResponse> = {},
) {
  // Build query string
  const queryParams = new URLSearchParams({
    entityId: entityId || '',
    entityType: entityType || '',
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });

  if (filters.status) {
    queryParams.append('status', filters.status);
  }
  if (filters.priority) {
    queryParams.append('priority', filters.priority);
  }
  if (filters.assigneeId) {
    queryParams.append('assigneeId', filters.assigneeId);
  }

  const endpoint =
    entityId && entityType
      ? `/v1/task-management?${queryParams.toString()}`
      : null;

  return useApiSWR<PaginatedTaskItemsResponse>(endpoint, {
    ...options,
    // Keep previous data visible while loading new page
    keepPreviousData: true,
  });
}

/**
 * Hook to fetch task items statistics for any entity
 */
export function useTaskItemsStats(
  entityId: string | null,
  entityType: TaskItemEntityType | null,
  options: UseApiSWROptions<TaskItemsStats> = {},
) {
  const endpoint =
    entityId && entityType
      ? `/v1/task-management/stats?entityId=${entityId}&entityType=${entityType}`
      : null;

  return useApiSWR<TaskItemsStats>(endpoint, options);
}

/**
 * Hook for task item CRUD operations
 * Universal actions that work with any entityType
 */
export function useTaskItemActions() {
  const api = useApi();

  const createTaskItem = useCallback(
    async (data: CreateTaskItemData) => {
      const response = await api.post<TaskItem>('/v1/task-management', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const updateTaskItem = useCallback(
    async (taskItemId: string, data: UpdateTaskItemData) => {
      const response = await api.put<TaskItem>(
        `/v1/task-management/${taskItemId}`,
        data,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const deleteTaskItem = useCallback(
    async (taskItemId: string) => {
      const response = await api.delete(`/v1/task-management/${taskItemId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return { success: true, status: response.status };
    },
    [api],
  );

  return {
    createTaskItem,
    updateTaskItem,
    deleteTaskItem,
  };
}

/**
 * Hook with optimistic updates for better UX
 * Automatically updates cache optimistically before API call completes
 * Note: This hook works with paginated responses and updates the current page
 */
export function useOptimisticTaskItems(
  entityId: string,
  entityType: TaskItemEntityType,
  page: number = 1,
  limit: number = 5,
  sortBy: TaskItemSortBy = 'createdAt',
  sortOrder: TaskItemSortOrder = 'desc',
  filters: TaskItemFilters = {},
) {
  const { data, error, isLoading, mutate } = useTaskItems(entityId, entityType, page, limit, sortBy, sortOrder, filters);
  const { createTaskItem, updateTaskItem, deleteTaskItem } = useTaskItemActions();

  const optimisticCreate = useCallback(
    async (createData: CreateTaskItemData) => {
      const optimisticTaskItem: TaskItem = {
        id: `temp-${Date.now()}`,
        title: createData.title,
        description: createData.description || null,
        status: createData.status || 'todo',
        priority: createData.priority || 'medium',
        entityId: createData.entityId,
        entityType: createData.entityType,
        assignee: null, // Will be populated by real response
        createdBy: {
          id: 'temp-member',
          user: {
            id: 'temp-user',
            name: 'You',
            email: '',
            image: null,
          },
        },
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return mutate(
        async () => {
          const newTaskItem = await createTaskItem(createData);
          const currentResponse = data?.data;
          const currentTaskItems = currentResponse?.data || [];
          const currentMeta = currentResponse?.meta;

          return {
            data: {
              data: [newTaskItem, ...currentTaskItems],
              meta: currentMeta
                ? {
                    ...currentMeta,
                    total: currentMeta.total + 1,
                    totalPages: Math.ceil((currentMeta.total + 1) / currentMeta.limit),
                  }
                : {
                    page: 1,
                    limit: limit,
                    total: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                  },
            },
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: {
                  data: [optimisticTaskItem, ...(data.data?.data || [])],
                  meta: data.data?.meta
                    ? {
                        ...data.data.meta,
                        total: data.data.meta.total + 1,
                        totalPages: Math.ceil((data.data.meta.total + 1) / data.data.meta.limit),
                      }
                    : {
                        page: 1,
                        limit: limit,
                        total: 1,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPrevPage: false,
                      },
                },
              }
            : {
                data: {
                  data: [optimisticTaskItem],
                  meta: {
                    page: 1,
                    limit: limit,
                    total: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                  },
                },
                status: 200,
              },
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );
    },
    [mutate, createTaskItem, data],
  );

  const optimisticUpdate = useCallback(
    async (taskItemId: string, updateData: UpdateTaskItemData) => {
      return mutate(
        async () => {
          const updatedTaskItem = await updateTaskItem(taskItemId, updateData);
          const currentResponse = data?.data;
          const currentTaskItems = currentResponse?.data || [];

          return {
            data: {
              data: currentTaskItems.map((item) =>
                item.id === taskItemId ? updatedTaskItem : item,
              ),
              meta: currentResponse?.meta || {
                page: 1,
                limit: limit,
                total: currentTaskItems.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
              },
            },
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: {
                  data: (data.data?.data || []).map((item) =>
                    item.id === taskItemId
                      ? { ...item, ...updateData }
                      : item,
                  ),
                  meta: data.data?.meta || {
                    page: page,
                    limit: limit,
                    total: data.data?.data?.length || 0,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                  },
                },
              }
            : undefined,
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );
    },
    [mutate, updateTaskItem, data],
  );

  const optimisticDelete = useCallback(
    async (taskItemId: string) => {
      // Optimistically remove the item from the UI immediately
      const currentResponse = data?.data;
      const currentTaskItems = currentResponse?.data || [];
      const itemExists = currentTaskItems.some((item) => item.id === taskItemId);
      
      if (!itemExists) {
        // Item already removed, just return success
        return;
      }

      return mutate(
        async () => {
          try {
            await deleteTaskItem(taskItemId);
          } catch (error: any) {
            // If item not found (404), it's already deleted - treat as success
            if (error?.response?.status === 404 || error?.status === 404) {
              // Item already deleted, continue with optimistic update
            } else {
              throw error;
            }
          }
          
          const updatedTaskItems = currentTaskItems.filter(
            (item) => item.id !== taskItemId,
          );
          const currentMeta = currentResponse?.meta;

          return {
            data: {
              data: updatedTaskItems,
              meta: currentMeta
                ? {
                    ...currentMeta,
                    total: Math.max(0, currentMeta.total - 1),
                    totalPages: Math.ceil(Math.max(0, currentMeta.total - 1) / currentMeta.limit),
                  }
                : {
                    page: 1,
                    limit: limit,
                    total: updatedTaskItems.length,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                  },
            },
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: {
                  data: (data.data?.data || []).filter(
                    (item) => item.id !== taskItemId,
                  ),
                  meta: data.data?.meta
                    ? {
                        ...data.data.meta,
                        total: Math.max(0, data.data.meta.total - 1),
                        totalPages: Math.ceil(
                          Math.max(0, data.data.meta.total - 1) / data.data.meta.limit,
                        ),
                      }
                    : {
                        page: page,
                        limit: limit,
                        total: Math.max(0, (data.data?.data?.length || 0) - 1),
                        totalPages: 1,
                        hasNextPage: false,
                        hasPrevPage: false,
                      },
                },
              }
            : undefined,
          populateCache: true,
          revalidate: true,
          rollbackOnError: true,
        },
      );
    },
    [mutate, deleteTaskItem, data, page, limit],
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

/**
 * Convenience hook for vendor task items
 */
export function useVendorTaskItems(
  vendorId: string | null,
  page: number = 1,
  limit: number = 5,
  sortBy: TaskItemSortBy = 'createdAt',
  sortOrder: TaskItemSortOrder = 'desc',
  filters: TaskItemFilters = {},
  options: UseApiSWROptions<PaginatedTaskItemsResponse> = {},
) {
  return useTaskItems(vendorId, 'vendor', page, limit, sortBy, sortOrder, filters, options);
}

/**
 * Convenience hook for risk task items
 */
export function useRiskTaskItems(
  riskId: string | null,
  page: number = 1,
  limit: number = 5,
  sortBy: TaskItemSortBy = 'createdAt',
  sortOrder: TaskItemSortOrder = 'desc',
  filters: TaskItemFilters = {},
  options: UseApiSWROptions<PaginatedTaskItemsResponse> = {},
) {
  return useTaskItems(riskId, 'risk', page, limit, sortBy, sortOrder, filters, options);
}

