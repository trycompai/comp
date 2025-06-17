import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { FrameworkEditorTaskTemplate } from '@prisma/client';
import { Frequency, Departments } from '@prisma/client'; // Added import for enums
import { createTaskTemplate, updateTaskTemplate, deleteTaskTemplate } from '../actions'; // Task-specific actions
import { useToast } from '@comp/ui/use-toast'; // Assuming this path is correct
import type { ItemWithName } from '../../../components/grid/RelationalCell'; // Corrected import for ItemWithName

// TODO: Define this based on what's displayed in the grid and what's editable.
// This will mirror ControlsPageGridData but for Tasks.
export interface TasksPageGridData {
  id: string;
  name: string | null;
  description: string | null; // Reverted to string | null
  frequency: string | null; // Or your specific enum type if available
  department: string | null; // Or your specific enum type if available
  controls: ItemWithName[]; // This uses ItemWithName from RelationalCell
  controlsLength: number; // Added for sorting/displaying count of linked controls
  createdAt: Date | null;
  updatedAt: Date | null;
  // Add any other fields that will be displayed or are part of the task entity
  // For example, if tasks can be linked to anything, those counts/relations would go here.
}

// Copied from ControlsPage types, adjust if your DSG operations are different for tasks
export interface DSGOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  fromRowIndex: number;
  toRowIndex: number;
}

// Define result types for creation operations for Tasks
type TaskCreationSuccessResult = {
  success: true;
  tempId: string;
  newId: string;
  newTask: FrameworkEditorTaskTemplate;
};
type TaskCreationFailureResult = { success: false; tempId: string; error: any };
type TaskCreationOperationResult = TaskCreationSuccessResult | TaskCreationFailureResult;

export const simpleUUID = () => crypto.randomUUID();

export const useTaskChangeTracking = (initialData: TasksPageGridData[]) => {
  const [data, setData] = useState<TasksPageGridData[]>(initialData);
  const [prevData, setPrevData] = useState<TasksPageGridData[]>(initialData);
  const { toast } = useToast();

  const isMounted = useRef(true);
  const displayedDataRef = useRef<TasksPageGridData[]>(initialData);

  const createdRowIds = useMemo(() => new Set<string>(), []);
  const updatedRowIds = useMemo(() => new Set<string>(), []);
  const deletedRowIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    setData(initialData);
    setPrevData(initialData);
    createdRowIds.clear();
    updatedRowIds.clear();
    deletedRowIds.clear();
  }, [initialData, createdRowIds, updatedRowIds, deletedRowIds]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const setDisplayedData = useCallback((displayedData: TasksPageGridData[]) => {
    displayedDataRef.current = displayedData;
  }, []);

  const handleGridChange = useCallback(
    (newValue: TasksPageGridData[], operations: DSGOperation[]) => {
      setData((currentDataState) => {
        if (!isMounted.current) {
          return currentDataState;
        }

        let workingNewValue = [...newValue];
        const originalDataForDelete = displayedDataRef.current;

        operations.forEach((op) => {
          if (op.type === 'CREATE') {
            workingNewValue.slice(op.fromRowIndex, op.toRowIndex).forEach((row) => {
              if (row.id) createdRowIds.add(row.id);
            });
          } else if (op.type === 'UPDATE') {
            workingNewValue.slice(op.fromRowIndex, op.toRowIndex).forEach((row) => {
              if (row.id && !createdRowIds.has(row.id) && !deletedRowIds.has(row.id)) {
                updatedRowIds.add(row.id);
              }
            });
          } else if (op.type === 'DELETE') {
            let keptRowsForDisplay = 0;
            originalDataForDelete.slice(op.fromRowIndex, op.toRowIndex).forEach((deletedRow, i) => {
              if (!deletedRow.id) return;
              updatedRowIds.delete(deletedRow.id);
              if (createdRowIds.has(deletedRow.id)) {
                createdRowIds.delete(deletedRow.id);
              } else {
                deletedRowIds.add(deletedRow.id);
                // Ensure the correct row is spliced back for display if it was an existing, now-deleted row
                workingNewValue.splice(
                  op.fromRowIndex + keptRowsForDisplay++,
                  0,
                  originalDataForDelete[op.fromRowIndex + i],
                );
              }
            });
          }
        });

        // Log the state of tracking sets after processing operations
        return workingNewValue;
      });
    },
    [createdRowIds, updatedRowIds, deletedRowIds],
  );

  const getRowClassName = useCallback(
    ({ rowData }: { rowData: TasksPageGridData }) => {
      if (!rowData || !rowData.id) return '';
      if (deletedRowIds.has(rowData.id)) return 'row-deleted';
      if (createdRowIds.has(rowData.id)) return 'row-created';
      if (updatedRowIds.has(rowData.id)) return 'row-updated';
      return '';
    },
    [createdRowIds, updatedRowIds, deletedRowIds],
  );

  const handleCommit = useCallback(async () => {
    let workingData = [...data];
    let successfulCommits = 0;
    let failedCommits = 0;

    // --- Handle Creations ---
    const creationOps = Array.from(createdRowIds).map((tempId) => {
      const row = workingData.find((r) => r.id === tempId);
      if (row && row.name) {
        // Ensure name is present, adapt other required fields as needed
        return createTaskTemplate({
          name: row.name,
          description: row.description, // Pass as string | null directly
          frequency: row.frequency as Frequency | null,
          department: row.department as Departments | null,
        })
          .then(
            (newTask: FrameworkEditorTaskTemplate) =>
              ({
                success: true,
                tempId,
                newId: newTask.id,
                newTask,
              }) as TaskCreationSuccessResult,
          )
          .catch((error) => {
            console.error(`Failed to create task (tempId: ${tempId}):`, error);
            failedCommits++;
            return {
              success: false,
              tempId,
              error,
            } as TaskCreationFailureResult;
          });
      }
      console.warn(`Skipping creation for task with tempId ${tempId} due to missing data or name.`);
      failedCommits++;
      return Promise.resolve({
        success: false,
        tempId,
        error: new Error('Missing data or name for task creation'),
      } as TaskCreationFailureResult);
    });
    const creationResults = await Promise.allSettled(creationOps);

    // --- Handle Updates (excluding newly created or already deleted items) ---
    const idsToUpdateActually = Array.from(updatedRowIds).filter(
      (id) => !createdRowIds.has(id) && !deletedRowIds.has(id),
    );
    const updateOps = idsToUpdateActually.map((id) => {
      const row = workingData.find((r) => r.id === id);
      if (row && row.name) {
        // Ensure name is present
        return updateTaskTemplate(id, {
          name: row.name,
          description: row.description, // Pass as string | null directly
          frequency: row.frequency as Frequency | null,
          department: row.department as Departments | null,
        })
          .then(() => {
            successfulCommits++;
            return { success: true, id };
          })
          .catch((error) => {
            console.error(`Failed to update task (id: ${id}):`, error);
            failedCommits++;
            return { success: false, id, error };
          });
      }
      console.warn(`Skipping update for task with id ${id} due to missing data or name.`);
      failedCommits++;
      return Promise.resolve({
        success: false,
        id,
        error: new Error('Missing data or name for task update'),
      });
    });
    const updateResults = await Promise.allSettled(updateOps);

    // --- Handle Deletions ---
    const deletionOps = Array.from(deletedRowIds).map((id) => {
      // Avoid deleting items that were just created client-side but failed server-side creation
      const wasSuccessfullyCreatedOnServer = creationResults.some(
        (res) =>
          res.status === 'fulfilled' &&
          (res.value as TaskCreationOperationResult).success &&
          (res.value as TaskCreationSuccessResult).tempId === id &&
          (res.value as TaskCreationSuccessResult).newId,
      );

      if (createdRowIds.has(id) && !wasSuccessfullyCreatedOnServer) {
        console.log(`Client-side removal of temporary task item (never reached server): ${id}`);
        // No server call needed, it was never persisted. Just ensure it's cleaned from UI state.
        successfulCommits++; // Considered a success in terms of resolving the change
        return Promise.resolve({ success: true, id, clientSideDelete: true });
      }

      return deleteTaskTemplate(id)
        .then(() => {
          successfulCommits++;
          return { success: true, id };
        })
        .catch((error) => {
          console.error(`Failed to delete task (id: ${id}):`, error);
          failedCommits++;
          return { success: false, id, error };
        });
    });
    const deletionResults = await Promise.allSettled(deletionOps);

    // --- Consolidate Data and Update State ---
    const serverCreatedRows = new Map<string, TasksPageGridData>();
    creationResults.forEach((res) => {
      if (res.status === 'fulfilled') {
        const creationValue = res.value as TaskCreationOperationResult;
        if (creationValue.success) {
          const { tempId, newId, newTask } = creationValue;
          const originalRow = workingData.find((r) => r.id === tempId);
          if (originalRow) {
            serverCreatedRows.set(newId, {
              ...originalRow,
              id: newId,
              name: newTask.name,
              description: newTask.description, // Expect string | null from server
              frequency: newTask.frequency,
              department: newTask.department,
              controls: originalRow.controls,
              controlsLength: originalRow.controlsLength,
              createdAt: newTask.createdAt ? new Date(newTask.createdAt) : null,
              updatedAt: newTask.updatedAt ? new Date(newTask.updatedAt) : null,
            });
          }
          createdRowIds.delete(tempId);
        }
      }
    });

    updateResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.success && res.value.id) {
        updatedRowIds.delete(res.value.id);
        // Optionally, update the row in workingData/data with server-returned data if updateTaskTemplate returned it
      }
    });

    const actuallyDeletedIdsServer = new Set<string>();
    deletionResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.success && res.value.id) {
        actuallyDeletedIdsServer.add(res.value.id);
        deletedRowIds.delete(res.value.id);
        createdRowIds.delete(res.value.id);
        updatedRowIds.delete(res.value.id);
      }
    });

    setData((currentData) => {
      let finalData = currentData.filter((row) => !actuallyDeletedIdsServer.has(row.id));
      finalData = finalData
        .map((row) => {
          if (serverCreatedRows.has(row.id)) {
            // This logic needs to handle replacement of tempId with newId
            return serverCreatedRows.get(row.id)!;
          }
          // If a temp ID row didn't get successfully created, it might still be in 'data'
          // We need to ensure those are filtered out if their creation failed and they weren't client-side deleted.
          const creationFailedForThisTempId = creationResults.find(
            (res) =>
              res.status === 'fulfilled' &&
              (res.value as TaskCreationOperationResult).tempId === row.id &&
              !(res.value as TaskCreationOperationResult).success,
          );
          if (createdRowIds.has(row.id) && creationFailedForThisTempId) {
            return null; // Mark for removal
          }
          return row;
        })
        .filter(Boolean) as TasksPageGridData[]; // Remove nulls

      // Add newly created items that were not previously in 'data' under a tempId
      // This happens if the initial creation op used a tempId that was mapped directly.
      // More commonly, we replace items in `finalData` that have temp IDs with their server-confirmed versions.
      // The logic above handles replacement of tempId items if they are found by their tempId first.
      // Ensure any serverCreatedRows whose *newId* isn't already in finalData (e.g. if tempId was somehow lost) are added.
      // This part might be complex depending on how `DataSheetGrid` handles IDs post-creation.
      // For now, assuming mapping from tempId to newId is sufficient.

      // Replace tempId rows with their server-created counterparts
      // This ensures that rows that were identified by tempId are updated with their newId and server data.
      let processedData = finalData.map((row) => {
        const tempIdSuccessEntry = creationResults.find(
          (res): res is PromiseFulfilledResult<TaskCreationSuccessResult> =>
            res.status === 'fulfilled' &&
            (res.value as TaskCreationOperationResult).success &&
            (res.value as TaskCreationSuccessResult).tempId === row.id,
        );
        if (tempIdSuccessEntry) {
          const serverData = serverCreatedRows.get(tempIdSuccessEntry.value.newId);
          return serverData || row; // if somehow not in map, keep original (should not happen)
        }
        return row;
      });

      // Add any newly created items that weren't in the list by tempId (less common)
      serverCreatedRows.forEach((value, key) => {
        if (!processedData.some((r) => r.id === key)) {
          processedData.push(value);
        }
      });

      setPrevData([...processedData]); // Update prevData to the new committed state
      return processedData;
    });

    if (failedCommits > 0) {
      toast({
        title: 'Commit Partially Successful',
        description: `${successfulCommits} tasks saved, ${failedCommits} operations failed. Please check console for errors.`,
        variant: 'destructive',
      });
    } else if (successfulCommits > 0) {
      toast({
        title: 'Commit Successful',
        description: 'All task changes have been saved.',
        variant: 'success',
      });
    } else {
      toast({
        title: 'No Changes to Commit',
        description: 'There were no pending changes to save.',
        variant: 'default',
      });
    }

    // Clear tracking sets for items that were handled, irrespective of success/failure for now,
    // as they've been processed. Failed items remain in their current client state or are removed.
    // Server state is the source of truth post-commit. Consider a page refresh or re-fetch for full consistency.
    createdRowIds.clear();
    updatedRowIds.clear();
    deletedRowIds.clear();

    return {
      success: failedCommits === 0,
      needsRefresh: successfulCommits > 0 || failedCommits > 0, // Indicate if data might have changed
    };
  }, [data, createdRowIds, updatedRowIds, deletedRowIds, toast]); // Removed prevData, add task actions

  const handleCancel = useCallback(() => {
    setData([...prevData]);
    createdRowIds.clear();
    updatedRowIds.clear();
    deletedRowIds.clear();
    toast({
      title: 'Changes Canceled',
      description: 'Pending task changes have been reverted.',
      variant: 'default',
    });
  }, [prevData, createdRowIds, updatedRowIds, deletedRowIds, toast]);

  const isDirty = useMemo(() => {
    return createdRowIds.size > 0 || updatedRowIds.size > 0 || deletedRowIds.size > 0;
  }, [
    createdRowIds,
    updatedRowIds,
    deletedRowIds,
    createdRowIds.size,
    updatedRowIds.size,
    deletedRowIds.size,
  ]);

  const changesSummaryString = useMemo(() => {
    const parts = [];
    if (createdRowIds.size > 0) parts.push(`${createdRowIds.size} added`);
    if (updatedRowIds.size > 0) parts.push(`${updatedRowIds.size} updated`);
    if (deletedRowIds.size > 0) parts.push(`${deletedRowIds.size} deleted`);
    return parts.length > 0 ? `Pending changes: ${parts.join(', ')}.` : 'No pending changes.';
  }, [
    createdRowIds,
    updatedRowIds,
    deletedRowIds,
    createdRowIds.size,
    updatedRowIds.size,
    deletedRowIds.size,
  ]);

  return {
    dataForGrid: data,
    handleGridChange,
    getRowClassName,
    handleCommit,
    handleCancel,
    isDirty,
    createdRowIds, // Expose for potential use in column definitions (e.g. disabling edit on new rows)
    updatedRowIds,
    deletedRowIds,
    changesSummaryString,
    setDisplayedData,
  };
};
