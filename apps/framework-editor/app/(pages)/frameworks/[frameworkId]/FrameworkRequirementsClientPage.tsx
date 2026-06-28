'use client';

import { apiClient } from '@/app/lib/api-client';
import {
  loadColumnWidths,
  saveColumnWidths,
} from '@/app/components/table/column-widths-cookie';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Button } from '@trycompai/ui';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, PencilIcon, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ComboboxCell, DateCell, EditableCell, RelationalCell } from '../../../components/table';
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
  requirementFamily?: string | null;
  sortOrder?: number | null;
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

// FRAME-17: cookie key for this table's persisted column widths.
const REQUIREMENTS_COLS_COOKIE = 'fwk-requirements-col-widths';

export function FrameworkRequirementsClientPage({
  frameworkDetails,
  initialRequirements,
}: FrameworkRequirementsClientPageProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Row whose large description editor is currently open — highlighted so the
  // edited row is obvious behind the (semi-transparent) editor dialog.
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const initialGridData: RequirementGridRow[] = useMemo(
    () =>
      initialRequirements.map((r) => ({
        id: r.id,
        name: r.name ?? null,
        identifier: r.identifier ?? null,
        description: r.description ?? null,
        requirementFamily: r.requirementFamily ?? null,
        sortOrder: r.sortOrder ?? null,
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

  const uniqueFamilies = useMemo(() => {
    const families = new Set<string>();
    for (const row of data) {
      if (row.requirementFamily) families.add(row.requirementFamily);
    }
    return [...families].sort();
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('sortOrder', {
        header: 'Order',
        size: 90,
        // Numbered rows ascending, unset rows last, identifier as a tiebreak.
        // (tanstack inverts this for the desc toggle.)
        sortingFn: (a, b) => {
          const ao = a.original.sortOrder;
          const bo = b.original.sortOrder;
          if (ao !== bo) {
            if (ao == null) return 1;
            if (bo == null) return -1;
            return ao - bo;
          }
          return (a.original.identifier ?? '').localeCompare(
            b.original.identifier ?? '',
            undefined,
            { numeric: true },
          );
        },
        cell: ({ row, getValue }) => {
          const value = getValue();
          return (
            <EditableCell
              value={value == null ? null : String(value)}
              rowId={row.original.id}
              columnId="sortOrder"
              onUpdate={updateCell}
              placeholder="—"
            />
          );
        },
      }),
      columnHelper.accessor('requirementFamily', {
        header: 'Family',
        size: 200,
        cell: ({ row, getValue }) => (
          <ComboboxCell
            value={getValue()}
            rowId={row.original.id}
            columnId="requirementFamily"
            options={uniqueFamilies}
            onUpdate={updateCell}
          />
        ),
      }),
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
        // FRAME-17: allow widening well past the default so long requirement
        // text is readable inline once the column is resized.
        maxSize: 1200,
        cell: ({ row, getValue }) => {
          const { identifier, name } = row.original;
          const titleSuffix = [identifier, name].filter(Boolean).join(' - ');
          return (
            <EditableCell
              value={getValue()}
              rowId={row.original.id}
              columnId="description"
              onUpdate={updateCell}
              expandable
              expandTitle={
                titleSuffix
                  ? `Edit Requirement Description - ${titleSuffix}`
                  : 'Edit Requirement Description'
              }
              onExpandedChange={(open) =>
                setExpandedRowId(open ? row.original.id : null)
              }
            />
          );
        },
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
              allowSelectOnNewRows
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
        enableResizing: false,
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
    [uniqueFamilies, updateCell, updateRelational, deleteRow, createdIds],
  );

  // FRAME-18: default to the framework's configured order. Numbered requirements
  // come first; unset rows fall back to identifier order and sort last.
  const [sorting, setSorting] = useState<SortingState>([{ id: 'sortOrder', desc: false }]);

  // FRAME-17: persisted, drag-resizable column widths (cookie-backed). Loaded
  // after mount (cookie is client-only) to avoid an SSR hydration mismatch.
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  useEffect(() => {
    const saved = loadColumnWidths(REQUIREMENTS_COLS_COOKIE);
    if (Object.keys(saved).length > 0) setColumnSizing(saved);
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 60 },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  // Persist widths once a drag ends (not on every mouse move).
  const resizingColumn = table.getState().columnSizingInfo.isResizingColumn;
  const wasResizing = useRef(false);
  useEffect(() => {
    if (wasResizing.current && !resizingColumn) {
      saveColumnWidths(REQUIREMENTS_COLS_COOKIE, table.getState().columnSizing);
    }
    wasResizing.current = Boolean(resizingColumn);
  }, [resizingColumn, table]);

  const handleAddRow = useCallback(() => {
    addRow({
      id: simpleUUID(),
      name: 'New Requirement',
      identifier: '',
      description: '',
      requirementFamily: null,
      sortOrder: null,
      controlTemplates: [],
      controlTemplatesLength: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [addRow]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await apiClient<Record<string, unknown>>(
        `/framework/${frameworkDetails.id}/export`,
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = frameworkDetails.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      link.download = `${safeName}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Framework exported successfully');
    } catch (error) {
      console.error('[ExportFramework] Error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to export framework';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [frameworkDetails.id, frameworkDetails.name]);

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
            onClick={handleExport}
            disabled={isExporting}
            className="gap-1 rounded-xs"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
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
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed', width: table.getTotalSize() }}
        >
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-border text-muted-foreground relative border-b px-2 py-2 text-left text-xs font-medium"
                    style={{ width: header.getSize() }}
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
                    {/* FRAME-17: drag handle to resize this column. */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(event) => event.stopPropagation()}
                        className="hover:bg-primary/50 absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize select-none"
                      />
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
                className={`border-border hover:bg-muted/30 border-b transition-colors ${getRowClassName(row.original.id)} ${
                  expandedRowId === row.original.id
                    ? 'ring-primary !bg-primary/15 ring-2 ring-inset'
                    : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="overflow-hidden p-0"
                    style={{ width: cell.column.getSize() }}
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
