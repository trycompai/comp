'use client';

import { apiClient } from '@/app/lib/api-client';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Button } from '@trycompai/ui';
import { ArrowDown, ArrowUp, ArrowUpDown, Link, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  AddExistingItemDialog,
  type ExistingItemRaw,
} from '../../components/AddExistingItemDialog';
import {
  DateCell,
  EditableCell,
  MultiSelectCell,
  type MultiSelectOption,
  RelationalCell,
  type RelationalItem,
} from '../../components/table';
import { DOCUMENT_TYPE_OPTIONS } from './document-type-options';
import { simpleUUID, useChangeTracking, type ControlMutations } from './hooks/useChangeTracking';
import type { ControlsPageGridData, FrameworkEditorControlTemplateWithRelatedData } from './types';

interface RequirementApiItem {
  id: string;
  name: string;
  identifier: string;
  framework?: { name: string };
}

async function fetchAllPolicyTemplates(): Promise<RelationalItem[]> {
  return apiClient<RelationalItem[]>('/policy-template');
}

async function fetchAllRequirements(): Promise<RelationalItem[]> {
  const reqs = await apiClient<RequirementApiItem[]>('/requirement');
  return reqs.map((r) => {
    let displayName = r.identifier;
    if (r.identifier && r.name) {
      displayName = `${r.identifier} - ${r.name}`;
    } else if (r.name) {
      displayName = r.name;
    }
    return {
      id: r.id,
      name: displayName || 'Unnamed Requirement',
      sublabel: r.framework?.name,
    };
  });
}

async function fetchAllTaskTemplates(): Promise<RelationalItem[]> {
  return apiClient<RelationalItem[]>('/task-template');
}

async function linkControlRelation(
  controlId: string,
  relation: string,
  itemId: string,
): Promise<void> {
  await apiClient(`/control-template/${controlId}/${relation}/${itemId}`, { method: 'POST' });
}

async function unlinkControlRelation(
  controlId: string,
  relation: string,
  itemId: string,
): Promise<void> {
  await apiClient(`/control-template/${controlId}/${relation}/${itemId}`, { method: 'DELETE' });
}

interface ControlsClientPageProps {
  initialControls: FrameworkEditorControlTemplateWithRelatedData[];
  emptyMessage?: string;
  frameworkId?: string;
}

const columnHelper = createColumnHelper<ControlsPageGridData>();

export function ControlsClientPage({ initialControls, emptyMessage, frameworkId }: ControlsClientPageProps) {
  const mutations: ControlMutations = useMemo(
    () => ({
      createControl: (data: {
        name: string | null;
        description: string | null;
        documentTypes: string[];
      }) => {
        const queryParam = frameworkId ? `?frameworkId=${frameworkId}` : '';
        return apiClient<{ id: string }>(`/control-template${queryParam}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      updateControl: (
        id: string,
        data: { name: string; description: string; documentTypes: string[] },
      ) =>
        apiClient(`/control-template/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      deleteControl: (id: string) =>
        apiClient(`/control-template/${id}`, {
          method: 'DELETE',
        }),
    }),
    [frameworkId],
  );
  const initialGridData: ControlsPageGridData[] = useMemo(
    () =>
      initialControls.map((control) => ({
        id: control.id || simpleUUID(),
        name: control.name ?? null,
        description: control.description ?? null,
        policyTemplates: control.policyTemplates?.map((pt) => ({ id: pt.id, name: pt.name })) ?? [],
        requirements:
          control.requirements?.map((r) => ({
            id: r.id,
            name: r.name,
            sublabel: r.framework?.name,
          })) ?? [],
        taskTemplates: control.taskTemplates?.map((tt) => ({ id: tt.id, name: tt.name })) ?? [],
        documentTypes: (control.documentTypes as string[]) ?? [],
        policyTemplatesLength: control.policyTemplates?.length ?? 0,
        requirementsLength: control.requirements?.length ?? 0,
        taskTemplatesLength: control.taskTemplates?.length ?? 0,
        documentTypesLength: control.documentTypes?.length ?? 0,
        createdAt: control.createdAt ? new Date(control.createdAt) : null,
        updatedAt: control.updatedAt ? new Date(control.updatedAt) : null,
      })),
    [initialControls],
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
  } = useChangeTracking(initialGridData, mutations);

  const handleDocumentTypesUpdate = useCallback(
    (rowId: string, values: string[]) => {
      updateCell(rowId, 'documentTypes', values);
    },
    [updateCell],
  );

  const columns = useMemo(
    () => [
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
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            columnId="description"
            onUpdate={updateCell}
          />
        ),
      }),
      columnHelper.accessor('policyTemplates', {
        header: 'Linked Policies',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <RelationalCell
              items={getValue()}
              rowId={row.original.id}
              isNewRow={createdIds.has(row.original.id)}
              getAllItems={fetchAllPolicyTemplates}
              onLink={(controlId: string, ptId: string) =>
                linkControlRelation(controlId, 'policy-templates', ptId)
              }
              onUnlink={(controlId: string, ptId: string) =>
                unlinkControlRelation(controlId, 'policy-templates', ptId)
              }
              onLocalUpdate={(newItems: RelationalItem[]) =>
                updateRelational(row.original.id, 'policyTemplates', newItems)
              }
              label="Policy"
              labelPlural="Policies"
            />
          </div>
        ),
      }),
      columnHelper.accessor('requirements', {
        header: 'Linked Requirements',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <RelationalCell
              items={getValue()}
              rowId={row.original.id}
              isNewRow={createdIds.has(row.original.id)}
              getAllItems={fetchAllRequirements}
              onLink={(controlId: string, reqId: string) =>
                linkControlRelation(controlId, 'requirements', reqId)
              }
              onUnlink={(controlId: string, reqId: string) =>
                unlinkControlRelation(controlId, 'requirements', reqId)
              }
              onLocalUpdate={(newItems: RelationalItem[]) =>
                updateRelational(row.original.id, 'requirements', newItems)
              }
              label="Requirement"
              labelPlural="Requirements"
            />
          </div>
        ),
      }),
      columnHelper.accessor('taskTemplates', {
        header: 'Linked Tasks',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <RelationalCell
              items={getValue()}
              rowId={row.original.id}
              isNewRow={createdIds.has(row.original.id)}
              getAllItems={fetchAllTaskTemplates}
              onLink={(controlId: string, ttId: string) =>
                linkControlRelation(controlId, 'task-templates', ttId)
              }
              onUnlink={(controlId: string, ttId: string) =>
                unlinkControlRelation(controlId, 'task-templates', ttId)
              }
              onLocalUpdate={(newItems: RelationalItem[]) =>
                updateRelational(row.original.id, 'taskTemplates', newItems)
              }
              label="Task"
              labelPlural="Tasks"
            />
          </div>
        ),
      }),
      columnHelper.accessor('documentTypes', {
        header: 'Linked Documents',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <MultiSelectCell
              values={getValue()}
              options={DOCUMENT_TYPE_OPTIONS}
              rowId={row.original.id}
              onUpdate={handleDocumentTypesUpdate}
              label="Document"
              labelPlural="Documents"
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
    [updateCell, updateRelational, deleteRow, createdIds, handleDocumentTypesUpdate],
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

  const existingControlIds = useMemo(
    () => new Set(initialControls.map((c) => c.id)),
    [initialControls],
  );

  const fetchAllControlsForDialog = useCallback(
    () => apiClient<ExistingItemRaw[]>('/control-template'),
    [],
  );

  const handleAddRow = useCallback(() => {
    addRow({
      id: simpleUUID(),
      name: 'New Control',
      description: '',
      policyTemplates: [],
      requirements: [],
      taskTemplates: [],
      documentTypes: [],
      policyTemplatesLength: 0,
      requirementsLength: 0,
      taskTemplatesLength: 0,
      documentTypesLength: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [addRow]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
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
              Add Existing Control
            </Button>
          )}
          <Button onClick={handleAddRow} size="sm" className="rounded-xs">
            <Plus className="mr-1 h-4 w-4" />
            Add Control
          </Button>
        </div>
      </div>

      {frameworkId && (
        <AddExistingItemDialog
          isOpen={isAddExistingOpen}
          onOpenChange={setIsAddExistingOpen}
          frameworkId={frameworkId}
          itemType="control"
          existingItemIds={existingControlIds}
          fetchAllItems={fetchAllControlsForDialog}
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
                  {emptyMessage ?? 'No controls yet. Click "Add Control" to create one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
