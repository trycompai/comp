import { type TaskAutomationStatus } from '@/db';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/api-client';
import type { RelationalItem } from '../../../components/table';

export interface TasksPageGridData {
  id: string;
  name: string | null;
  description: string | null;
  frequency: string | null;
  department: string | null;
  automationStatus: TaskAutomationStatus | null;
  controls: RelationalItem[];
  controlsLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const simpleUUID = () => crypto.randomUUID();

export const useTaskChangeTracking = (initialData: TasksPageGridData[], frameworkId?: string) => {
  const [data, setData] = useState<TasksPageGridData[]>(() => initialData);
  const [prevData, setPrevData] = useState<TasksPageGridData[]>(() => initialData);

  // Track which rows have been created/deleted using state
  const [createdIds, setCreatedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // Create a map of original data for O(1) lookups
  const prevDataMap = useMemo(() => {
    const map = new Map<string, TasksPageGridData>();
    for (const row of prevData) {
      map.set(row.id, row);
    }
    return map;
  }, [prevData]);

  // Compute updated rows by comparing current data with original data
  const updatedIds = useMemo(() => {
    const updated = new Set<string>();
    for (const row of data) {
      // Skip newly created rows
      if (createdIds.has(row.id)) continue;

      const originalRow = prevDataMap.get(row.id);
      if (!originalRow) continue;

      // Compare relevant fields
      const hasChanges =
        row.name !== originalRow.name ||
        row.description !== originalRow.description ||
        row.frequency !== originalRow.frequency ||
        row.department !== originalRow.department ||
        row.automationStatus !== originalRow.automationStatus;

      if (hasChanges) {
        updated.add(row.id);
      }
    }
    return updated;
  }, [data, prevDataMap, createdIds]);

  // Sync state when initialData prop changes (e.g., after server revalidation)
  useEffect(() => {
    setData(initialData);
    setPrevData(initialData);
    setCreatedIds(new Set());
    setDeletedIds(new Set());
  }, [initialData]);

  const updateCell = useCallback((rowId: string, columnId: string, value: string) => {
    setData((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, [columnId]: value, updatedAt: new Date() };
      }),
    );
  }, []);

  // Relational changes are saved immediately via API calls, not on commit
  const updateRelational = useCallback(
    (rowId: string, field: 'controls', items: RelationalItem[]) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            [field]: items,
            [`${field}Length`]: items.length,
            updatedAt: new Date(),
          };
        }),
      );
    },
    [],
  );

  const addRow = useCallback((newRow: TasksPageGridData) => {
    setData((prev) => [...prev, newRow]);
    setCreatedIds((prev) => {
      const next = new Set(prev);
      next.add(newRow.id);
      return next;
    });
  }, []);

  const deleteRow = useCallback(
    (rowId: string) => {
      if (createdIds.has(rowId)) {
        setCreatedIds((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
        setData((prev) => prev.filter((row) => row.id !== rowId));
      } else {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(rowId);
          return next;
        });
      }
    },
    [createdIds],
  );

  const getRowClassName = useCallback(
    (rowId: string) => {
      if (deletedIds.has(rowId)) return 'opacity-50 line-through';
      if (createdIds.has(rowId)) return 'bg-green-50 dark:bg-green-950/20';
      if (updatedIds.has(rowId)) return 'bg-blue-50 dark:bg-blue-950/20';
      return '';
    },
    [deletedIds, createdIds, updatedIds],
  );

  const handleCommit = useCallback(async () => {
    const results = { successes: [] as string[], errors: [] as string[] };
    const currentData = data;

    // Track successful operations to clear only those from tracking
    const successfullyCreatedIds = new Set<string>();
    const successfullyUpdatedIds = new Set<string>();
    const successfullyDeletedIds = new Set<string>();
    // Track tempId → newServerId mapping for created rows
    const createdIdMapping = new Map<string, string>();

    // Handle creations
    for (const tempId of createdIds) {
      const row = currentData.find((r) => r.id === tempId);
      if (!row?.name) {
        results.errors.push(`Skipped creation for unsaved row (ID: ${tempId})`);
        continue;
      }

      try {
        const queryParam = frameworkId ? `?frameworkId=${frameworkId}` : '';
        const newTask = await apiClient<{ id: string }>(`/task-template${queryParam}`, {
          method: 'POST',
          body: JSON.stringify({
            name: row.name,
            description: row.description,
            frequency: row.frequency,
            department: row.department,
          }),
        });
        results.successes.push(`Created: ${row.name}`);
        successfullyCreatedIds.add(tempId);
        createdIdMapping.set(tempId, newTask.id);

        setData((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: newTask.id, controls: [] } : r)),
        );
      } catch (error) {
        results.errors.push(
          `Failed to create ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Handle updates
    for (const id of updatedIds) {
      if (createdIds.has(id) || deletedIds.has(id)) continue;

      const row = currentData.find((r) => r.id === id);
      if (!row?.name) {
        results.errors.push(`Skipped update for unsaved row (ID: ${id})`);
        continue;
      }

      try {
        await apiClient(`/task-template/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: row.name,
            description: row.description ?? '',
            frequency: row.frequency,
            department: row.department,
            automationStatus: row.automationStatus,
          }),
        });
        results.successes.push(`Updated: ${row.name}`);
        successfullyUpdatedIds.add(id);
      } catch (error) {
        results.errors.push(
          `Failed to update ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Handle deletions
    for (const id of deletedIds) {
      try {
        await apiClient(`/task-template/${id}`, { method: 'DELETE' });
        results.successes.push(`Deleted: ${id}`);
        successfullyDeletedIds.add(id);
      } catch (error) {
        results.errors.push(
          `Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Update both data and prevData atomically using functional updates
    // This ensures we work with the latest state, not stale closures
    setData((currentData) => {
      const finalData = currentData.filter((row) => !successfullyDeletedIds.has(row.id));

      // Update prevData using the latest data state
      setPrevData((prev) => {
        // Start with current prevData, removing deleted rows
        let newPrevData = prev.filter((row) => !successfullyDeletedIds.has(row.id));

        // For successfully updated rows, update their entry in prevData to match current data
        // This clears their "dirty" status
        newPrevData = newPrevData.map((row) => {
          if (successfullyUpdatedIds.has(row.id)) {
            const currentRow = finalData.find((r) => r.id === row.id);
            return currentRow ?? row;
          }
          return row;
        });

        // For successfully created rows, add them to prevData (with their new server IDs)
        // Use createdIdMapping to find rows by their new server ID
        for (const tempId of successfullyCreatedIds) {
          const newServerId = createdIdMapping.get(tempId);
          if (newServerId) {
            const createdRow = finalData.find((r) => r.id === newServerId);
            if (createdRow) {
              newPrevData.push(createdRow);
            }
          }
        }

        return newPrevData;
      });

      return finalData;
    });

    // Clear only successful operations - keep failed ones so user can retry
    setCreatedIds((prev) => {
      const remaining = new Set(prev);
      for (const id of successfullyCreatedIds) {
        remaining.delete(id);
      }
      return remaining;
    });
    setDeletedIds((prev) => {
      const remaining = new Set(prev);
      for (const id of successfullyDeletedIds) {
        remaining.delete(id);
      }
      return remaining;
    });

    // Show toast
    if (results.errors.length > 0) {
      toast.error('Some operations failed', { description: results.errors.join('\n') });
    } else if (results.successes.length > 0) {
      toast.success('Changes saved', {
        description: `${results.successes.length} operation(s) completed`,
      });
    }
  }, [data, createdIds, updatedIds, deletedIds, frameworkId]);

  const handleCancel = useCallback(() => {
    setData(prevData);
    setCreatedIds(new Set());
    setDeletedIds(new Set());
  }, [prevData]);

  const isDirty = useMemo(() => {
    return createdIds.size > 0 || updatedIds.size > 0 || deletedIds.size > 0;
  }, [createdIds, updatedIds, deletedIds]);

  const changesSummary = useMemo(() => {
    const total = createdIds.size + updatedIds.size + deletedIds.size;
    if (total === 0) return '';
    return `(${total} ${total === 1 ? 'change' : 'changes'})`;
  }, [createdIds, updatedIds, deletedIds]);

  return {
    data,
    updateCell,
    updateRelational,
    addRow,
    deleteRow,
    getRowClassName,
    handleCommit,
    handleCancel,
    isDirty,
    createdIds,
    changesSummary,
  };
};
