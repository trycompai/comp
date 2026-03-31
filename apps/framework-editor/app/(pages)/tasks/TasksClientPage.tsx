'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/ui';
import { ArrowDown, ArrowUp, ArrowUpDown, Link, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  AddExistingItemDialog,
  type ExistingItemRaw,
} from '../../components/AddExistingItemDialog';
import {
  DateCell,
  EditableCell,
  MarkdownCell,
  RelationalCell,
  SelectCell,
  type SelectOption,
} from '../../components/table';
import { apiClient } from '@/app/lib/api-client';
import {
  simpleUUID,
  useTaskChangeTracking,
  type TasksPageGridData,
} from './hooks/useTaskChangeTracking';

import type { FrameworkEditorControlTemplate, FrameworkEditorTaskTemplate } from '@/db';
import { Departments, Frequency, TaskAutomationStatus } from '@/db';

interface FrameworkEditorTaskTemplateWithRelatedControls extends FrameworkEditorTaskTemplate {
  controlTemplates?: Pick<FrameworkEditorControlTemplate, 'id' | 'name'>[];
}

// Options for Frequency select
const frequencyOptions: SelectOption[] = Object.values(Frequency).map((freq) => ({
  value: freq,
  label: freq.charAt(0).toUpperCase() + freq.slice(1).replace('_', ' '),
}));

// Options for Departments select
const departmentOptions: SelectOption[] = Object.values(Departments).map((dept) => ({
  value: dept,
  label: dept === 'none' ? 'None' : dept.toUpperCase(),
}));

interface TasksClientPageProps {
  initialTasks: FrameworkEditorTaskTemplateWithRelatedControls[];
  emptyMessage?: string;
  frameworkId?: string;
}

const columnHelper = createColumnHelper<TasksPageGridData>();

export function TasksClientPage({ initialTasks, emptyMessage, frameworkId }: TasksClientPageProps) {
  const initialGridData: TasksPageGridData[] = useMemo(
    () =>
      initialTasks.map((task) => ({
        id: task.id || simpleUUID(),
        name: task.name ?? null,
        description: task.description ?? null,
        frequency: task.frequency ?? null,
        department: task.department ?? null,
        automationStatus: task.automationStatus ?? TaskAutomationStatus.AUTOMATED,
        controls: task.controlTemplates?.map((ct) => ({ id: ct.id, name: ct.name })) ?? [],
        controlsLength: task.controlTemplates?.length ?? 0,
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
      })),
    [initialTasks],
  );

  const {
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
  } = useTaskChangeTracking(initialGridData, frameworkId);

  const fetchAllControls = useCallback(
    () => apiClient<Array<{ id: string; name: string }>>('/control-template'),
    [],
  );

  const handleLinkControl = useCallback(
    async (taskId: string, controlId: string): Promise<void> => {
      await apiClient(`/task-template/${taskId}/control-templates/${controlId}`, {
        method: 'POST',
      });
    },
    [],
  );

  const handleUnlinkControl = useCallback(
    async (taskId: string, controlId: string): Promise<void> => {
      await apiClient(`/task-template/${taskId}/control-templates/${controlId}`, {
        method: 'DELETE',
      });
    },
    [],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('automationStatus', {
        header: 'Automation',
        size: 130,
        cell: ({ row, getValue }) => {
          const status = getValue();
          const isAutomated = status === TaskAutomationStatus.AUTOMATED;
          return (
            <div className="px-2 py-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {isAutomated ? (
                    <Badge variant="default" className="min-w-[80px] cursor-pointer justify-center">
                      Automated
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="min-w-[80px] cursor-pointer justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Manual
                    </Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    disabled={isAutomated}
                    onClick={() =>
                      updateCell(
                        row.original.id,
                        'automationStatus',
                        TaskAutomationStatus.AUTOMATED,
                      )
                    }
                  >
                    Automated
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!isAutomated}
                    onClick={() =>
                      updateCell(row.original.id, 'automationStatus', TaskAutomationStatus.MANUAL)
                    }
                  >
                    Manual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        size: 250,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            columnId="name"
            onUpdate={updateCell}
          />
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        size: 300,
        maxSize: 300,
        cell: ({ row, getValue }) => (
          <MarkdownCell
            value={getValue()}
            rowId={row.original.id}
            columnId="description"
            onUpdate={updateCell}
          />
        ),
      }),
      columnHelper.accessor('frequency', {
        header: 'Frequency',
        size: 150,
        cell: ({ row, getValue }) => (
          <SelectCell
            value={getValue()}
            rowId={row.original.id}
            columnId="frequency"
            options={frequencyOptions}
            onUpdate={updateCell}
            placeholder="Select frequency..."
          />
        ),
      }),
      columnHelper.accessor('department', {
        header: 'Department',
        size: 150,
        cell: ({ row, getValue }) => (
          <SelectCell
            value={getValue()}
            rowId={row.original.id}
            columnId="department"
            options={departmentOptions}
            onUpdate={updateCell}
            placeholder="Select department..."
          />
        ),
      }),
      columnHelper.accessor('controls', {
        header: 'Linked Controls',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <RelationalCell
              items={getValue()}
              rowId={row.original.id}
              isNewRow={createdIds.has(row.original.id)}
              getAllItems={fetchAllControls}
              onLink={handleLinkControl}
              onUnlink={handleUnlinkControl}
              onLocalUpdate={(newItems) => updateRelational(row.original.id, 'controls', newItems)}
              label="Control"
              labelPlural="Controls"
            />
          </div>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created At',
        size: 180,
        cell: ({ getValue }) => <DateCell value={getValue()} />,
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Updated At',
        size: 180,
        cell: ({ getValue }) => <DateCell value={getValue()} />,
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        size: 280,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground truncate px-2 py-1.5 font-mono text-xs">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-7 w-7"
            onClick={() => deleteRow(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      }),
    ],
    [updateCell, updateRelational, deleteRow, createdIds, fetchAllControls, handleLinkControl, handleUnlinkControl],
  );

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);

  const existingTaskIds = useMemo(
    () => new Set(initialTasks.map((t) => t.id)),
    [initialTasks],
  );

  const fetchAllTasks = useCallback(
    () => apiClient<ExistingItemRaw[]>('/task-template'),
    [],
  );

  const handleAddRow = useCallback(() => {
    addRow({
      id: simpleUUID(),
      name: 'New Task',
      description: '',
      frequency: null,
      department: null,
      automationStatus: TaskAutomationStatus.AUTOMATED,
      controls: [],
      controlsLength: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [addRow]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <span className="text-muted-foreground text-sm">{changesSummary}</span>
              <Button variant="outline" onClick={handleCancel} size="sm" className="rounded-xs">
                Cancel
              </Button>
              <Button onClick={handleCommit} size="sm" className="rounded-xs">
                Commit Changes
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {frameworkId && (
            <Button
              variant="outline"
              onClick={() => setIsAddExistingOpen(true)}
              size="sm"
              className="rounded-xs"
            >
              <Link className="mr-1 h-4 w-4" />
              Add Existing Task
            </Button>
          )}
          <Button onClick={handleAddRow} size="sm" className="rounded-xs">
            <Plus className="mr-1 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {frameworkId && (
        <AddExistingItemDialog
          isOpen={isAddExistingOpen}
          onOpenChange={setIsAddExistingOpen}
          frameworkId={frameworkId}
          itemType="task"
          existingItemIds={existingTaskIds}
          fetchAllItems={fetchAllTasks}
        />
      )}

      <div className="scrollbar-primary border-border min-h-0 flex-1 overflow-auto rounded-xs border">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-border text-muted-foreground border-b px-2 py-2 text-left text-xs font-medium"
                    style={{
                      width: header.getSize(),
                      maxWidth: header.column.columnDef.maxSize,
                    }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUp className="h-3 w-3" />,
                          desc: <ArrowDown className="h-3 w-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-border hover:bg-muted/30 border-b transition-colors ${getRowClassName(row.original.id)}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-0"
                    style={{
                      width: cell.column.getSize(),
                      maxWidth: cell.column.columnDef.maxSize,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  {emptyMessage ?? 'No tasks yet. Click "Add Task" to create one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
