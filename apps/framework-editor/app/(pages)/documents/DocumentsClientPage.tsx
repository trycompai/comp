'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Badge } from '@trycompai/ui';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DOCUMENT_TYPE_OPTIONS } from '../controls/document-type-options';
import { DocumentControlsCell } from './DocumentControlsCell';

interface ControlWithDocumentTypes {
  id: string;
  name: string;
  documentTypes: string[];
}

interface DocumentRow {
  value: string;
  label: string;
  category: string;
  controls: { id: string; name: string }[];
  controlCount: number;
}

interface DocumentsClientPageProps {
  controls: ControlWithDocumentTypes[];
}

const columnHelper = createColumnHelper<DocumentRow>();

export function DocumentsClientPage({ controls }: DocumentsClientPageProps) {
  const [controlsState, setControlsState] = useState(controls);

  const data: DocumentRow[] = useMemo(() => {
    return DOCUMENT_TYPE_OPTIONS.map((opt: { value: string; label: string; category?: string }) => {
      const linkedControls = controlsState
        .filter((c) => (c.documentTypes as string[]).includes(opt.value))
        .map((c) => ({ id: c.id, name: c.name }));

      return {
        value: opt.value,
        label: opt.label,
        category: opt.category ?? 'Uncategorized',
        controls: linkedControls,
        controlCount: linkedControls.length,
      };
    });
  }, [controlsState]);

  const handleControlLinked = (documentType: string, control: { id: string; name: string }) => {
    setControlsState((prev) => {
      const exists = prev.some((c) => c.id === control.id);
      if (exists) {
        return prev.map((c) =>
          c.id === control.id
            ? { ...c, documentTypes: [...(c.documentTypes as string[]), documentType] }
            : c,
        );
      }
      return [...prev, { id: control.id, name: control.name, documentTypes: [documentType] }];
    });
  };

  const handleControlUnlinked = (documentType: string, controlId: string) => {
    setControlsState((prev) =>
      prev.map((c) =>
        c.id === controlId
          ? { ...c, documentTypes: (c.documentTypes as string[]).filter((t) => t !== documentType) }
          : c,
      ),
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('label', {
        header: 'Document Type',
        size: 280,
        cell: ({ getValue }) => (
          <span className="px-2 py-1.5 text-sm font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        size: 160,
        cell: ({ getValue }) => (
          <div className="px-2 py-1.5">
            <Badge variant="outline">{getValue()}</Badge>
          </div>
        ),
      }),
      columnHelper.accessor('controls', {
        header: 'Linked Controls',
        size: 300,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="relative">
            <DocumentControlsCell
              documentType={row.original.value}
              controls={row.original.controls}
              onControlLinked={handleControlLinked}
              onControlUnlinked={handleControlUnlinked}
            />
          </div>
        ),
      }),
      columnHelper.accessor('controlCount', {
        header: 'Count',
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground px-2 py-1.5 text-sm tabular-nums">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('value', {
        header: 'Key',
        size: 240,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground truncate px-2 py-1.5 font-mono text-xs">
            {getValue()}
          </span>
        ),
      }),
    ],
    [handleControlLinked, handleControlUnlinked],
  );

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.value,
  });

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-primary border-border min-h-0 flex-1 overflow-auto rounded-xs border">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-border text-muted-foreground border-b px-2 py-2 text-left text-xs font-medium"
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
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-border hover:bg-muted/30 border-b transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-0"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
