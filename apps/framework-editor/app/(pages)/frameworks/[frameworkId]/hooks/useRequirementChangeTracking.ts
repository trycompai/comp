import { apiClient } from '@/app/lib/api-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface RequirementGridRow {
  id: string;
  name: string | null;
  identifier: string | null;
  description: string | null;
  controlTemplates: Array<{ id: string; name: string }>;
  controlTemplatesLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const simpleUUID = () => crypto.randomUUID();

export function useRequirementChangeTracking(
  initialData: RequirementGridRow[],
  frameworkId: string,
) {
  const [data, setData] = useState<RequirementGridRow[]>(() => initialData);
  const [prevData, setPrevData] = useState<RequirementGridRow[]>(() => initialData);

  const [createdIds, setCreatedIds] = useState<Set<string>>(() => new Set());
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setData(initialData);
    setPrevData(initialData);
    setCreatedIds(new Set());
    setUpdatedIds(new Set());
    setDeletedIds(new Set());
  }, [initialData]);

  const updateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          return { ...row, [columnId]: value, updatedAt: new Date() };
        }),
      );
      setUpdatedIds((prev) => {
        if (createdIds.has(rowId)) return prev;
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    },
    [createdIds],
  );

  const updateRelational = useCallback(
    (rowId: string, items: Array<{ id: string; name: string }>) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            controlTemplates: items,
            controlTemplatesLength: items.length,
            updatedAt: new Date(),
          };
        }),
      );
    },
    [],
  );

  const addRow = useCallback((newRow: RequirementGridRow) => {
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
        setUpdatedIds((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
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
    const okCreated = new Set<string>();
    const okUpdated = new Set<string>();
    const okDeleted = new Set<string>();

    for (const tempId of createdIds) {
      const row = currentData.find((r) => r.id === tempId);
      if (!row?.name) continue;
      try {
        const created = await apiClient<{ id: string }>('/requirement', {
          method: 'POST',
          body: JSON.stringify({
            frameworkId,
            name: row.name,
            identifier: row.identifier ?? '',
            description: row.description ?? '',
          }),
        });
        results.successes.push(`Created: ${row.name}`);
        okCreated.add(tempId);
        setData((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: created.id } : r)),
        );
      } catch (error) {
        results.errors.push(
          `Failed to create ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    for (const id of updatedIds) {
      if (createdIds.has(id) || deletedIds.has(id)) continue;
      const row = currentData.find((r) => r.id === id);
      if (!row?.name) continue;
      try {
        await apiClient(`/requirement/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: row.name,
            identifier: row.identifier ?? '',
            description: row.description ?? '',
          }),
        });
        results.successes.push(`Updated: ${row.name}`);
        okUpdated.add(id);
      } catch (error) {
        results.errors.push(
          `Failed to update ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    for (const id of deletedIds) {
      try {
        await apiClient(`/requirement/${id}`, { method: 'DELETE' });
        results.successes.push(`Deleted: ${id}`);
        okDeleted.add(id);
      } catch (error) {
        results.errors.push(
          `Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    setData((prev) => {
      const finalData = prev.filter((row) => !okDeleted.has(row.id));
      setPrevData(finalData);
      return finalData;
    });
    setCreatedIds((prev) => {
      const remaining = new Set(prev);
      for (const id of okCreated) remaining.delete(id);
      return remaining;
    });
    setUpdatedIds((prev) => {
      const remaining = new Set(prev);
      for (const id of okUpdated) remaining.delete(id);
      return remaining;
    });
    setDeletedIds((prev) => {
      const remaining = new Set(prev);
      for (const id of okDeleted) remaining.delete(id);
      return remaining;
    });

    if (results.errors.length > 0) {
      toast.error('Some operations failed', {
        description: results.errors.join('\n'),
      });
    } else if (results.successes.length > 0) {
      toast.success('Changes saved', {
        description: `${results.successes.length} operation(s) completed`,
      });
    }
  }, [data, createdIds, updatedIds, deletedIds, frameworkId]);

  const handleCancel = useCallback(() => {
    setData(prevData);
    setCreatedIds(new Set());
    setUpdatedIds(new Set());
    setDeletedIds(new Set());
  }, [prevData]);

  const isDirty = useMemo(
    () => createdIds.size > 0 || updatedIds.size > 0 || deletedIds.size > 0,
    [createdIds, updatedIds, deletedIds],
  );

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
}
