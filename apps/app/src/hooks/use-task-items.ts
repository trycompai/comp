'use client';

import { useApi } from '@/hooks/use-api';
import { useApiSWR, UseApiSWROptions } from '@/hooks/use-api-swr';
import { useCallback } from 'react';

export type TaskItemEntityType = 'vendor' | 'risk';

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

const PRIORITY_ORDER: Record<TaskItemPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const matchesFilters = (item: TaskItem, filters: TaskItemFilters): boolean => {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.priority && item.priority !== filters.priority) return false;
  if (filters.assigneeId) {
    if (filters.assigneeId === '__unassigned__') {
      return item.assignee === null;
    }
    return item.assignee?.id === filters.assigneeId;
  }
  return true;
};

const compareTaskItems = (
  a: TaskItem,
  b: TaskItem,
  sortBy: TaskItemSortBy,
  sortOrder: TaskItemSortOrder,
): number => {
  const dir = sortOrder === 'asc' ? 1 : -1;

  const cmp = (x: number, y: number) => (x === y ? 0 : x > y ? 1 : -1);

  switch (sortBy) {
    case 'createdAt': {
      const av = new Date(a.createdAt).getTime();
      const bv = new Date(b.createdAt).getTime();
      return dir * cmp(av, bv);
    }
    case 'updatedAt': {
      const av = new Date(a.updatedAt).getTime();
      const bv = new Date(b.updatedAt).getTime();
      return dir * cmp(av, bv);
    }
    case 'priority': {
      const av = PRIORITY_ORDER[a.priority] ?? 0;
      const bv = PRIORITY_ORDER[b.priority] ?? 0;
      return dir * cmp(av, bv);
    }
    case 'title': {
      return dir * a.title.localeCompare(b.title);
    }
    case 'status': {
      return dir * a.status.localeCompare(b.status);
    }
    default:
      return 0;
  }
};

const recomputeMeta = (
  meta: PaginatedTaskItemsResponse['meta'] | undefined,
  opts: { page: number; limit: number; total: number },
) => {
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.limit));
  return {
    page: meta?.page ?? opts.page,
    limit: meta?.limit ?? opts.limit,
    total: opts.total,
    totalPages,
    hasNextPage: (meta?.page ?? opts.page) < totalPages,
    hasPrevPage: (meta?.page ?? opts.page) > 1,
  };
};

/**
 * Hook to fetch task items for any entity using SWR with pagination, filtering, and sorting
 * Universal hook that works with any supported entityType (vendor, risk)
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

          // If the created item doesn't match the current filters, do not show it in this view
          if (!matchesFilters(newTaskItem, filters)) {
            return {
              data: {
                data: currentTaskItems,
                meta: currentMeta || recomputeMeta(undefined, { page, limit, total: currentTaskItems.length }),
              },
              status: 200,
            };
          }

          const nextItems = [newTaskItem, ...currentTaskItems]
            .filter((item) => matchesFilters(item, filters))
            .sort((a, b) => compareTaskItems(a, b, sortBy, sortOrder))
            .slice(0, limit);

          const nextTotal = (currentMeta?.total ?? currentTaskItems.length) + 1;

          return {
            data: {
              data: nextItems,
              meta: recomputeMeta(currentMeta, { page, limit, total: nextTotal }),
            },
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: {
                  data: matchesFilters(optimisticTaskItem, filters)
                    ? [optimisticTaskItem, ...(data.data?.data || [])]
                        .filter((item) => matchesFilters(item, filters))
                        .sort((a, b) => compareTaskItems(a, b, sortBy, sortOrder))
                        .slice(0, limit)
                    : (data.data?.data || []),
                  meta: matchesFilters(optimisticTaskItem, filters)
                    ? recomputeMeta(data.data?.meta, {
                        page,
                        limit,
                        total: (data.data?.meta?.total ?? (data.data?.data || []).length) + 1,
                      })
                    : (data.data?.meta ??
                        recomputeMeta(undefined, { page, limit, total: (data.data?.data || []).length })),
                },
              }
            : {
                data: {
                  data: matchesFilters(optimisticTaskItem, filters) ? [optimisticTaskItem] : [],
                  meta: recomputeMeta(undefined, {
                    page,
                    limit,
                    total: matchesFilters(optimisticTaskItem, filters) ? 1 : 0,
                  }),
                },
                status: 200,
              },
          populateCache: true,
          // Revalidate to keep pagination/meta perfectly consistent with server
          revalidate: true,
          rollbackOnError: true,
        },
      );
    },
    [mutate, createTaskItem, data, filters, sortBy, sortOrder, page, limit],
  );

  const optimisticUpdate = useCallback(
    async (taskItemId: string, updateData: UpdateTaskItemData) => {
      return mutate(
        async () => {
          const updatedTaskItem = await updateTaskItem(taskItemId, updateData);
          const currentResponse = data?.data;
          const currentTaskItems = currentResponse?.data || [];
          const currentMeta = currentResponse?.meta;

          const updatedList = currentTaskItems
            .map((item) => (item.id === taskItemId ? updatedTaskItem : item))
            .filter((item) => matchesFilters(item, filters))
            .sort((a, b) => compareTaskItems(a, b, sortBy, sortOrder))
            .slice(0, limit);

          // If the item was visible but now no longer matches filters, decrement the filtered total
          const existedBefore = currentTaskItems.some((item) => item.id === taskItemId);
          const matchedBefore =
            existedBefore &&
            matchesFilters(
              currentTaskItems.find((i) => i.id === taskItemId)!,
              filters,
            );
          const matchedAfter = matchesFilters(updatedTaskItem, filters);

          const totalDelta = matchedBefore && !matchedAfter ? -1 : !matchedBefore && matchedAfter ? 1 : 0;
          const nextTotal = (currentMeta?.total ?? currentTaskItems.length) + totalDelta;

          return {
            data: {
              data: updatedList,
              meta: recomputeMeta(currentMeta, { page, limit, total: Math.max(0, nextTotal) }),
            },
            status: 200,
          };
        },
        {
          optimisticData: data
            ? {
                ...data,
                data: {
                  data: (data.data?.data || [])
                    .map((item) =>
                      item.id === taskItemId ? { ...item, ...updateData } : item,
                    )
                    .filter((item) => matchesFilters(item as TaskItem, filters))
                    .sort((a, b) =>
                      compareTaskItems(a as TaskItem, b as TaskItem, sortBy, sortOrder),
                    )
                    .slice(0, limit),
                  meta: data.data?.meta ?? recomputeMeta(undefined, { page, limit, total: (data.data?.data || []).length }),
                },
              }
            : undefined,
          populateCache: true,
          revalidate: true,
          rollbackOnError: true,
        },
      );
    },
    [mutate, updateTaskItem, data, filters, sortBy, sortOrder, page, limit],
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

