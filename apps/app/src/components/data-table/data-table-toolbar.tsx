'use client';

import type { Column, Table } from '@tanstack/react-table';
import { Plus, Search, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Input } from '@comp/ui/input';
import { useQueryState } from 'nuqs';
import { DataTableDateFilter } from './data-table-date-filter';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableSliderFilter } from './data-table-slider-filter';

interface DataTableToolbarProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>;
  sheet?: string;
  action?: string;
}

export function DataTableToolbar<TData>({
  table,
  sheet,
  action,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [open, setOpen] = useQueryState(sheet ?? '');
  const isOpen = Boolean(open);

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn('flex w-full items-center justify-between gap-2', className)}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <X className="h-4 w-4" />
            <span className="ml-2 hidden md:inline">Reset</span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {sheet && (
          <Button variant="default" size="sm" onClick={() => setOpen('true')}>
            <Plus className="h-4 w-4" />
            <span>{action}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({ column }: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;

  const onFilterRender = React.useCallback(() => {
    if (!columnMeta?.variant) return null;

    switch (columnMeta.variant) {
      case 'text':
        return (
          <div className="relative w-full max-w-xs">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(event) => {
                column.setFilterValue(event.target.value);
              }}
              className="w-full min-w-56"
            />
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className={cn('w-32', columnMeta.unit && 'pr-8')}
            />
            {columnMeta.unit && (
              <span className="bg-muted text-muted-foreground absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 text-sm">
                {columnMeta.unit}
              </span>
            )}
          </div>
        );

      case 'range':
        return <DataTableSliderFilter column={column} title={columnMeta.label ?? column.id} />;

      case 'date':
      case 'dateRange':
        return (
          <DataTableDateFilter
            column={column}
            title={columnMeta.label ?? column.id}
            multiple={columnMeta.variant === 'dateRange'}
          />
        );

      case 'select':
      case 'multiSelect':
        return (
          <DataTableFacetedFilter
            column={column}
            title={columnMeta.label ?? column.id}
            options={columnMeta.options ?? []}
            multiple={columnMeta.variant === 'multiSelect'}
          />
        );

      default:
        return null;
    }
  }, [column, columnMeta]);

  return onFilterRender();
}
