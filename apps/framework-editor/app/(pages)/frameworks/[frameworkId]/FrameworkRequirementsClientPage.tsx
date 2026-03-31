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
import { ArrowDown, ArrowUp, ArrowUpDown, PencilIcon, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { DateCell, EditableCell, RelationalCell } from '../../../components/table';
import { EditFrameworkDialog } from './components/EditFrameworkDialog';
import { DeleteFrameworkDialog } from './components/DeleteFrameworkDialog';
import {
  simpleUUID,
  useRequirementChangeTracking,
  type RequirementGridRow,
} from './hooks/useRequirementChangeTracking';

interface FrameworkDetails {
  id: string;
  name: string;
  version: string;
  description: string;
  visible: boolean;
}

interface RequirementInput {
  id: string;
  name: string;
  identifier: string;
  description: string;
  frameworkId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  controlTemplates?: Array<{ id: string; name: string }>;
}

interface FrameworkRequirementsClientPageProps {
  frameworkDetails: FrameworkDetails;
  initialRequirements: RequirementInput[];
}

async function fetchAllControlTemplates() {
  return apiClient<Array<{ id: string; name: string }>>('/control-template');
}

async function linkControlToRequirement(requirementId: string, controlId: string) {
  await apiClient(`/control-template/${controlId}/requirements/${requirementId}`, {
    method: 'POST',
  });
}

async function unlinkControlFromRequirement(requirementId: string, controlId: string) {
  await apiClient(`/control-template/${controlId}/requirements/${requirementId}`, {
    method: 'DELETE',
  });
}

const columnHelper = createColumnHelper<RequirementGridRow>();

export function FrameworkRequirementsClientPage({
  frameworkDetails,
  initialRequirements,
}: FrameworkRequirementsClientPageProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const initialGridData: RequirementGridRow[] = useMemo(
    () =>
      initialRequirements.map((r) => ({
        id: r.id,
        name: r.name ?? null,
        identifier: r.identifier ?? null,
        description: r.description ?? null,
        controlTemplates: r.controlTemplates ?? [],
        controlTemplatesLength: r.controlTemplates?.length ?? 0,
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : null,
      })),
    [initialRequirements],
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
  } = useRequirementChangeTracking(initialGridData, frameworkDetails.id);

  const columns = useMemo(
    () => [
      columnHelper.accessor('identifier', {
        header: 'Identifier',
        size: 140,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            columnId="identifier"
            onUpdate={updateCell}
          />
        ),
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
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            columnId="description"
            onUpdate={updateCell}
          />
        ),
      }),
      columnHelper.accessor('controlTemplates', {
        header: 'Linked Controls',
        size: 220,
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <div className="relative">
            <RelationalCell
              items={getValue()}
              rowId={row.original.id}
              isNewRow={createdIds.has(row.original.id)}
              getAllItems={fetchAllControlTemplates}
              onLink={linkControlToRequirement}
              onUnlink={unlinkControlFromRequirement}
              onLocalUpdate={(newItems) =>
                updateRelational(row.original.id, newItems)
              }
              label="Control"
              labelPlural="Controls"
            />
          </div>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        size: 160,
        cell: ({ getValue }) => <DateCell value={getValue()} />,
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Updated',
        size: 160,
        cell: ({ getValue }) => <DateCell value={getValue()} />,
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
    [updateCell, updateRelational, deleteRow, createdIds],
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

  const handleAddRow = useCallback(() => {
    addRow({
      id: simpleUUID(),
      name: 'New Requirement',
      identifier: '',
      description: '',
      controlTemplates: [],
      controlTemplatesLength: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [addRow]);

  const handleFrameworkUpdated = () => {
    setIsEditDialogOpen(false);
    router.refresh();
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1 rounded-xs"
          >
            <PencilIcon className="h-4 w-4" />
            Edit Framework
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="gap-1 rounded-xs"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleAddRow} size="sm" className="rounded-xs">
            <Plus className="mr-1 h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      </div>

      <div className="scrollbar-primary border-border min-h-0 flex-1 overflow-auto rounded-xs border">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-border text-muted-foreground border-b px-2 py-2 text-left text-xs font-medium"
                    style={{ width: header.getSize(), maxWidth: header.column.columnDef.maxSize }}
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
                    style={{ width: cell.column.getSize(), maxWidth: cell.column.columnDef.maxSize }}
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
                  No requirements yet. Click "Add Requirement" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isEditDialogOpen && (
        <EditFrameworkDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          framework={frameworkDetails}
          onFrameworkUpdated={handleFrameworkUpdated}
        />
      )}
      {isDeleteDialogOpen && (
        <DeleteFrameworkDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          frameworkId={frameworkDetails.id}
          frameworkName={frameworkDetails.name}
        />
      )}
    </div>
  );
}
