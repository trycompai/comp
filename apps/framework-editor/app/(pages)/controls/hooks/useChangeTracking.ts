import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ControlsPageGridData } from '../types';

export const simpleUUID = () => crypto.randomUUID();

export interface ControlMutations {
  createControl: (data: {
    name: string | null;
    description: string | null;
    documentTypes: string[];
  }) => Promise<{ id: string }>;
  updateControl: (
    id: string,
    data: { name: string; description: string; documentTypes: string[] },
  ) => Promise<unknown>;
  deleteControl: (id: string) => Promise<unknown>;
}

export const useChangeTracking = (
  initialData: ControlsPageGridData[],
  mutations: ControlMutations,
) => {
  const [data, setData] = useState<ControlsPageGridData[]>(() => initialData);
  const [prevData, setPrevData] = useState<ControlsPageGridData[]>(() => initialData);

  const [createdIds, setCreatedIds] = useState<Set<string>>(() => new Set());
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    setData(initialData);
    setPrevData(initialData);
    setCreatedIds(new Set());
    setUpdatedIds(new Set());
    setDeletedIds(new Set());
  }, [initialData]);

  const updateCell = useCallback(
    (rowId: string, columnId: string, value: string | string[]) => {
      if (isCommitting) return;
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const updated: Record<string, unknown> = { [columnId]: value, updatedAt: new Date() };
          if (Array.isArray(value)) {
            updated[`${columnId}Length`] = value.length;
          }
          return { ...row, ...updated };
        }),
      );

      setUpdatedIds((prev) => {
        if (createdIds.has(rowId)) return prev;
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    },
    [createdIds, isCommitting],
  );

  const updateRelational = useCallback(
    (
      rowId: string,
      field: 'policyTemplates' | 'requirements' | 'taskTemplates',
      items: { id: string; name: string; sublabel?: string }[],
    ) => {
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

  const addRow = useCallback(
    (newRow: ControlsPageGridData) => {
      if (isCommitting) return;
      setData((prev) => [...prev, newRow]);
      setCreatedIds((prev) => {
        const next = new Set(prev);
        next.add(newRow.id);
        return next;
      });
    },
    [isCommitting],
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      if (isCommitting) return;
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
    [createdIds, isCommitting],
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
    if (isCommitting) return;
    setIsCommitting(true);

    try {
      const results = { successes: [] as string[], errors: [] as string[] };
      const currentData = data;

      const successfullyCreatedIds = new Set<string>();
      const successfullyUpdatedIds = new Set<string>();
      const successfullyDeletedIds = new Set<string>();

      for (const tempId of createdIds) {
        const row = currentData.find((r) => r.id === tempId);
        if (!row?.name) continue;

        try {
          const newControl = await mutations.createControl({
            name: row.name,
            description: row.description,
            documentTypes: row.documentTypes,
          });
          results.successes.push(`Created: ${row.name}`);
          successfullyCreatedIds.add(tempId);

          setData((prev) =>
            prev.map((r) =>
              r.id === tempId
                ? {
                    ...r,
                    id: newControl.id,
                    policyTemplates: [],
                    requirements: [],
                    taskTemplates: [],
                  }
                : r,
            ),
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
          await mutations.updateControl(id, {
            name: row.name,
            description: row.description || '',
            documentTypes: row.documentTypes,
          });
          results.successes.push(`Updated: ${row.name}`);
          successfullyUpdatedIds.add(id);
        } catch (error) {
          results.errors.push(
            `Failed to update ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      for (const id of deletedIds) {
        try {
          await mutations.deleteControl(id);
          results.successes.push(`Deleted: ${id}`);
          successfullyDeletedIds.add(id);
        } catch (error) {
          results.errors.push(
            `Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setData((prev) => {
        const finalData = prev.filter((row) => !successfullyDeletedIds.has(row.id));
        setPrevData(finalData);
        return finalData;
      });

      setCreatedIds((prev) => {
        const remaining = new Set(prev);
        for (const id of successfullyCreatedIds) remaining.delete(id);
        return remaining;
      });
      setUpdatedIds((prev) => {
        const remaining = new Set(prev);
        for (const id of successfullyUpdatedIds) remaining.delete(id);
        return remaining;
      });
      setDeletedIds((prev) => {
        const remaining = new Set(prev);
        for (const id of successfullyDeletedIds) remaining.delete(id);
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
    } finally {
      setIsCommitting(false);
    }
  }, [data, createdIds, updatedIds, deletedIds, mutations, isCommitting]);

  const handleCancel = useCallback(() => {
    if (isCommitting) return;
    setData(prevData);
    setCreatedIds(new Set());
    setUpdatedIds(new Set());
    setDeletedIds(new Set());
  }, [prevData, isCommitting]);

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
    isCommitting,
    createdIds,
    changesSummary,
  };
};
