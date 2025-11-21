'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Input } from '@comp/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@comp/ui/table';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Filter, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataTableHeader } from './DataTableHeader';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';

interface FilterItem {
  label: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

interface FilterCategory {
  label: string;
  items: FilterItem[];
  maxHeight?: string;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  onRowClick?: (row: TData) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: {
    categories: FilterCategory[];
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    activeFilterCount?: number;
  };
  ctaButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function DataTable<TData>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = 'No data found.',
  isLoading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  search,
  filters,
  ctaButton,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchValue, setSearchValue] = useState(search?.value || '');

  // Internal debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search?.onChange(searchValue);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchValue, search]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 40,
      size: 150,
    },
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  // Only show pagination when we have valid data and total count
  const showPagination = pagination && data.length > 0 && pagination.totalCount > 0;

  return (
    <div className="space-y-4">
      {(search || filters) && (
        <div className="flex items-center gap-3">
          {search && (
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder={search.placeholder || 'Search...'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pr-8 pl-8"
                />
                {searchValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setSearchValue('')}
                  >
                    <X className="text-muted-foreground h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          {filters && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-9 px-3', filters.hasActiveFilters && 'border-primary')}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {filters.hasActiveFilters && filters.activeFilterCount && (
                    <Badge variant="secondary" className="ml-2 px-1 py-0">
                      {filters.activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[500px] max-w-[90vw]">
                <div className="grid grid-cols-2 gap-4 p-2">
                  {filters.categories.map((category, index) => (
                    <div key={category.label}>
                      <DropdownMenuLabel>{category.label}</DropdownMenuLabel>
                      <div
                        className={cn(
                          'space-y-1',
                          category.maxHeight && 'overflow-y-auto',
                          index < filters.categories.length - 1 && 'mb-3',
                        )}
                        style={
                          category.maxHeight
                            ? {
                                maxHeight: category.maxHeight,
                              }
                            : undefined
                        }
                      >
                        {category.items.map((item) => (
                          <DropdownMenuCheckboxItem
                            key={item.value}
                            checked={item.checked}
                            onCheckedChange={item.onChange}
                          >
                            {item.icon ? (
                              <div className="flex items-center gap-2">
                                {item.icon}
                                <span>{item.label}</span>
                              </div>
                            ) : (
                              item.label
                            )}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {filters.hasActiveFilters && (
                  <div className="px-2 pb-2">
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-start text-sm font-normal"
                      onClick={filters.onClearFilters}
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {ctaButton && (
            <Button className="ml-auto flex flex-row gap-2" onClick={ctaButton.onClick}>
              {ctaButton.icon}
              {ctaButton.label}
            </Button>
          )}
        </div>
      )}

      <div className={cn('relative w-full', className)}>
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Table>
            <DataTableHeader table={table} />
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <DataTableSkeleton columns={columns.length} rows={10} />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn('hover:bg-muted/50', onRowClick && 'cursor-pointer')}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="relative px-3 py-2 whitespace-nowrap text-sm"
                        style={{
                          width: cell.column.getSize(),
                        }}
                      >
                        <div>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        <div
                          className={`bg-border absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none opacity-0 select-none hover:opacity-100 ${
                            table.getState().columnSizingInfo.isResizingColumn === cell.column.id
                              ? 'bg-primary opacity-100'
                              : ''
                          }`}
                          onClick={(e) => {
                            // Stop propagation to prevent row click when resizing
                            e.stopPropagation();
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showPagination && onPageChange && onPageSizeChange && (
        <DataTablePagination
          {...pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
