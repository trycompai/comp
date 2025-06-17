import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useQueryState } from 'nuqs';
import * as React from 'react';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  tableId?: string;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [50, 100, 200],
  tableId,
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const pageParam = tableId ? `${tableId}_page` : 'page';
  const perPageParam = tableId ? `${tableId}_perPage` : 'perPage';

  const [page, setPage] = useQueryState(pageParam);
  const [perPage, setPerPage] = useQueryState(perPageParam);

  // Parse URL query params
  const pageIndex = React.useMemo(() => {
    if (!page) return table.getState().pagination.pageIndex;
    try {
      const parsed = Number.parseInt(page, 10);
      return Number.isNaN(parsed) ? table.getState().pagination.pageIndex : parsed - 1;
    } catch (e) {
      return table.getState().pagination.pageIndex;
    }
  }, [page, table]);

  const pageSizeValue = React.useMemo(() => {
    if (!perPage) return table.getState().pagination.pageSize;
    try {
      const parsed = Number.parseInt(perPage, 10);
      return Number.isNaN(parsed) ? table.getState().pagination.pageSize : parsed;
    } catch (e) {
      return table.getState().pagination.pageSize;
    }
  }, [perPage, table]);

  // Use effect to update table pagination when query params change
  React.useEffect(() => {
    if (pageIndex !== table.getState().pagination.pageIndex) {
      table.setPageIndex(pageIndex);
    }

    if (pageSizeValue !== table.getState().pagination.pageSize) {
      table.setPageSize(pageSizeValue);
    }
  }, [pageIndex, pageSizeValue, table]);

  // Sync URL with table state on initial render
  React.useEffect(() => {
    const currentPageIndex = table.getState().pagination.pageIndex;
    const currentPageSize = table.getState().pagination.pageSize;

    if (page === undefined && currentPageIndex > 0) {
      setPage((currentPageIndex + 1).toString());
    }

    if (perPage === undefined && currentPageSize !== 10) {
      setPerPage(currentPageSize.toString());
    }
  }, [table, page, perPage, setPage, setPerPage]);

  // Handlers that update both table state and URL query params
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setPage((newPage + 1).toString());
      table.setPageIndex(newPage);
    },
    [setPage, table],
  );

  const handlePageSizeChange = React.useCallback(
    (value: string) => {
      const newSize = Number(value);
      setPerPage(value);
      table.setPageSize(newSize);
    },
    [setPerPage, table],
  );

  return (
    <div className={cn('flex items-center justify-between px-2 py-4', className)} {...props}>
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span className="hidden sm:inline">{table.getCoreRowModel().rows.length} items</span>
        <div className="hidden items-center gap-2 sm:flex">
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="bottom">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground mr-2 hidden text-sm sm:inline">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => handlePageChange(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex - 1)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex + 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => handlePageChange(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
