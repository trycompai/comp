'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IsmsRequirementsCell } from './IsmsRequirementsCell';
import type { IsmsDocumentTemplate, MappedRequirement } from './types';

interface IsmsDocumentRow {
  id: string;
  name: string;
  documentType: string;
  clause: string | null;
  requirements: MappedRequirement[];
  requirementCount: number;
}

interface IsmsDocumentsClientPageProps {
  templates: IsmsDocumentTemplate[];
  frameworkId: string;
}

const columnHelper = createColumnHelper<IsmsDocumentRow>();

export function IsmsDocumentsClientPage({
  templates,
  frameworkId,
}: IsmsDocumentsClientPageProps) {
  const [templatesState, setTemplatesState] = useState(templates);

  const data: IsmsDocumentRow[] = useMemo(
    () =>
      templatesState.map((template) => {
        const requirements = template.requirementLinks.map((link) => ({
          id: link.requirement.id,
          name: link.requirement.identifier
            ? `${link.requirement.identifier} - ${link.requirement.name}`
            : link.requirement.name,
        }));
        return {
          id: template.id,
          name: template.name,
          documentType: template.documentType,
          clause: template.clause,
          requirements,
          requirementCount: requirements.length,
        };
      }),
    [templatesState],
  );

  const handleRequirementLinked = (
    templateId: string,
    requirement: MappedRequirement,
  ) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              requirementLinks: [
                ...template.requirementLinks,
                {
                  id: `local_${requirement.id}`,
                  frameworkId,
                  requirementId: requirement.id,
                  requirement: {
                    id: requirement.id,
                    name: requirement.name,
                    identifier: '',
                    framework: { id: frameworkId, name: '' },
                  },
                },
              ],
            }
          : template,
      ),
    );
  };

  const handleRequirementUnlinked = (templateId: string, requirementId: string) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              requirementLinks: template.requirementLinks.filter(
                (link) => link.requirement.id !== requirementId,
              ),
            }
          : template,
      ),
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Document',
        size: 280,
        cell: ({ getValue }) => (
          <span className="px-2 py-1.5 text-sm font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor('documentType', {
        header: 'Document Type',
        size: 220,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground truncate px-2 py-1.5 font-mono text-xs">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('clause', {
        header: 'Clause',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground px-2 py-1.5 text-sm tabular-nums">
            {getValue() ?? '—'}
          </span>
        ),
      }),
      columnHelper.accessor('requirements', {
        header: 'Mapped Requirements',
        size: 300,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="relative">
            <IsmsRequirementsCell
              templateId={row.original.id}
              requirements={row.original.requirements}
              frameworkId={frameworkId}
              onLinked={handleRequirementLinked}
              onUnlinked={handleRequirementUnlinked}
            />
          </div>
        ),
      }),
      columnHelper.accessor('requirementCount', {
        header: 'Count',
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground px-2 py-1.5 text-sm tabular-nums">
            {getValue()}
          </span>
        ),
      }),
    ],
    [frameworkId],
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
                        className="hover:text-foreground flex cursor-pointer items-center gap-1"
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
                  <td key={cell.id} className="p-0" style={{ width: cell.column.getSize() }}>
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
                  No ISMS document templates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
