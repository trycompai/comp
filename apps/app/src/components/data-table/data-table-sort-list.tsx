'use client';

import { getDataTableConfig } from '@/lib/data-table-config';
import type { ColumnSort, SortDirection, Table } from '@tanstack/react-table';
import { Branch, T, useGT } from 'gt-next';
import { ArrowDownUp, ChevronsUpDown, GripVertical, Trash2 } from 'lucide-react';
import { useQueryState } from 'nuqs';
import * as React from 'react';

import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/data-table/sortable';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@comp/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';

const OPEN_MENU_SHORTCUT = 's';
const REMOVE_SORT_SHORTCUTS = ['backspace', 'delete'];

interface DataTableSortListProps<TData> extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  tableId?: string;
}

export function DataTableSortList<TData>({
  table,
  tableId,
  ...props
}: DataTableSortListProps<TData>) {
  const t = useGT();
  const dataTableConfig = React.useMemo(() => getDataTableConfig(t), [t]);
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  const sortParam = tableId ? `${tableId}_sort` : 'sort';
  const [urlSorting, setUrlSorting] = useQueryState(sortParam);

  // Parse the URL sorting state
  const parsedSorting = React.useMemo(() => {
    try {
      if (!urlSorting) return [];

      // Check if urlSorting is already an object (this can happen with nuqs)
      if (typeof urlSorting === 'object' && urlSorting !== null) {
        // If it's already an array, validate its structure
        if (Array.isArray(urlSorting)) {
          const sortArray = urlSorting as unknown[];
          return sortArray.every(
            (item: unknown) =>
              typeof item === 'object' &&
              item !== null &&
              'id' in (item as object) &&
              'desc' in (item as object),
          )
            ? (sortArray as ColumnSort[])
            : [];
        }
        return [];
      }

      // Parse the string if it's a string
      if (typeof urlSorting === 'string') {
        const parsed = JSON.parse(urlSorting);
        // Validate that we have a proper array of ColumnSort objects
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              'id' in item &&
              'desc' in item &&
              typeof item.id === 'string',
          )
        ) {
          return parsed as ColumnSort[];
        }
      }

      return [];
    } catch (e) {
      console.error('Error parsing sort state:', e);
      return [];
    }
  }, [urlSorting]);

  // Use URL sorting if available, otherwise use table state
  const sorting = React.useMemo(() => {
    return parsedSorting.length > 0 ? parsedSorting : table.getState().sorting || [];
  }, [parsedSorting, table]);

  // Custom sorting change handler that updates both table and URL
  const onSortingChange = React.useCallback(
    (updater: ColumnSort[] | ((prev: ColumnSort[]) => ColumnSort[])) => {
      // Update table sorting
      table.setSorting(updater);

      // Update URL sorting
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;

      // Only set URL if there's something to save
      if (newSorting.length > 0) {
        // Convert to a proper JSON string
        try {
          const stringified = JSON.stringify(newSorting);
          setUrlSorting(stringified);
        } catch (e) {
          console.error('Error stringifying sort state:', e);
          setUrlSorting(null);
        }
      } else {
        setUrlSorting(null);
      }
    },
    [table, sorting, setUrlSorting],
  );

  const { columnLabels, columns } = React.useMemo(() => {
    const labels = new Map<string, string>();
    const sortingIds = new Set(sorting.map((s) => s.id));
    const availableColumns: { id: string; label: string }[] = [];

    for (const column of table.getAllColumns()) {
      if (!column.getCanSort()) continue;

      // Use a safe way to get the label
      let label = column.columnDef.meta?.label;
      if (!label) {
        // Try to get accessorKey if available
        label = column.id;
      }
      labels.set(column.id, label);

      if (!sortingIds.has(column.id)) {
        availableColumns.push({ id: column.id, label });
      }
    }

    return {
      columnLabels: labels,
      columns: availableColumns,
    };
  }, [sorting, table]);

  const onSortAdd = React.useCallback(() => {
    const firstColumn = columns[0];
    if (!firstColumn) return;

    onSortingChange((prevSorting) => [...prevSorting, { id: firstColumn.id, desc: false }]);
  }, [columns, onSortingChange]);

  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<ColumnSort>) => {
      onSortingChange((prevSorting) => {
        if (!prevSorting.length) return prevSorting;
        return prevSorting.map((sort) => (sort.id === sortId ? { ...sort, ...updates } : sort));
      });
    },
    [onSortingChange],
  );

  const onSortRemove = React.useCallback(
    (sortId: string) => {
      onSortingChange((prevSorting) => prevSorting.filter((item) => item.id !== sortId));
    },
    [onSortingChange],
  );

  const onSortingReset = React.useCallback(() => {
    const initialSorting = table.initialState.sorting || [];
    onSortingChange(initialSorting);
  }, [onSortingChange, table.initialState.sorting]);

  // Sync table sorting with URL on component mount
  React.useEffect(() => {
    if (parsedSorting.length > 0) {
      // Only update if different to avoid unnecessary renders
      const currentSorting = table.getState().sorting;
      if (JSON.stringify(parsedSorting) !== JSON.stringify(currentSorting)) {
        table.setSorting(parsedSorting);
      }
    }
  }, [parsedSorting, table]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (
        event.key.toLowerCase() === OPEN_MENU_SHORTCUT &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key.toLowerCase() === OPEN_MENU_SHORTCUT && event.shiftKey && sorting.length > 0) {
        event.preventDefault();
        onSortingReset();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sorting.length, onSortingReset]);

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase()) && sorting.length > 0) {
        event.preventDefault();
        onSortingReset();
      }
    },
    [sorting.length, onSortingReset],
  );

  return (
    <Sortable value={sorting} onValueChange={onSortingChange} getItemValue={(item) => item.id}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onKeyDown={onTriggerKeyDown}
            className="items-center gap-1.5"
          >
            <ArrowDownUp className="hidden size-4 md:block" />
            <T>Sort</T>
            {sorting.length > 0 && (
              <Badge
                variant="secondary"
                className="h-[18.24px] px-[5.12px] font-mono text-[10.4px] font-normal"
              >
                {sorting.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className="flex w-full max-w-[var(--radix-popover-content-available-width)] origin-[var(--radix-popover-content-transform-origin)] flex-col gap-3.5 p-4 sm:min-w-[380px]"
          {...props}
        >
          <div className="relative flex flex-col gap-1">
            <T>
              <h4 id={labelId} className="leading-none font-medium">
                <Branch
                  branch={(sorting.length > 0).toString()}
                  true="Sort by"
                  false="No sorting applied"
                />
              </h4>
            </T>
            <T>
              <p
                id={descriptionId}
                className={cn('text-muted-foreground text-sm', sorting.length > 0 && 'sr-only')}
              >
                <Branch
                  branch={(sorting.length > 0).toString()}
                  true="Modify sorting to organize your rows."
                  false="Add sorting to organize your rows."
                />
              </p>
            </T>
          </div>
          {sorting.length > 0 && (
            <SortableContent asChild>
              <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1">
                {sorting.map((sort) => (
                  <DataTableSortItem
                    key={sort.id}
                    sort={sort}
                    sortItemId={`${id}-sort-${sort.id}`}
                    columns={columns}
                    columnLabels={columnLabels}
                    onSortUpdate={onSortUpdate}
                    onSortRemove={onSortRemove}
                  />
                ))}
              </div>
            </SortableContent>
          )}
          <div className="flex w-full items-center gap-2">
            <Button
              size="sm"
              ref={addButtonRef}
              onClick={onSortAdd}
              disabled={columns.length === 0}
            >
              <T>Add sort</T>
            </Button>
            {sorting.length > 0 && (
              <Button variant="outline" size="sm" onClick={onSortingReset}>
                <T>Reset sorting</T>
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 h-8 w-[180px]" />
          <div className="bg-primary/10 h-8 w-24" />
          <div className="bg-primary/10 size-8 shrink-0" />
          <div className="bg-primary/10 size-8 shrink-0" />
        </div>
      </SortableOverlay>
    </Sortable>
  );
}

interface DataTableSortItemProps {
  sort: ColumnSort;
  sortItemId: string;
  columns: { id: string; label: string }[];
  columnLabels: Map<string, string>;
  onSortUpdate: (sortId: string, updates: Partial<ColumnSort>) => void;
  onSortRemove: (sortId: string) => void;
}

function DataTableSortItem({
  sort,
  sortItemId,
  columns,
  columnLabels,
  onSortUpdate,
  onSortRemove,
}: DataTableSortItemProps) {
  const t = useGT();
  const dataTableConfig = React.useMemo(() => getDataTableConfig(t), [t]);
  const fieldListboxId = `${sortItemId}-field-listbox`;
  const fieldTriggerId = `${sortItemId}-field-trigger`;
  const directionListboxId = `${sortItemId}-direction-listbox`;

  const [showFieldSelector, setShowFieldSelector] = React.useState(false);
  const [showDirectionSelector, setShowDirectionSelector] = React.useState(false);

  const onItemKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (showFieldSelector || showDirectionSelector) {
        return;
      }

      if (REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase())) {
        event.preventDefault();
        onSortRemove(sort.id);
      }
    },
    [sort.id, showFieldSelector, showDirectionSelector, onSortRemove],
  );

  return (
    <SortableItem value={sort.id} asChild>
      <div
        id={sortItemId}
        tabIndex={-1}
        className="flex items-center gap-2"
        onKeyDown={onItemKeyDown}
      >
        <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
          <PopoverTrigger asChild>
            <Button
              id={fieldTriggerId}
              aria-controls={fieldListboxId}
              variant="outline"
              size="sm"
              className="w-44 justify-between font-normal"
            >
              <span className="truncate">
                {columnLabels.get(sort.id) || sort.id || 'Unknown column'}
              </span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={fieldListboxId}
            className="w-[var(--radix-popover-trigger-width)] origin-[var(--radix-popover-content-transform-origin)] p-0"
          >
            <Command>
              <CommandInput placeholder={t('Search fields...')} />
              <CommandList>
                <CommandEmpty>{t('No fields found.')}</CommandEmpty>
                <CommandGroup>
                  {columns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={column.id}
                      onSelect={(value) =>
                        onSortUpdate(sort.id, {
                          id: value,
                        })
                      }
                    >
                      <span className="truncate">{column.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          open={showDirectionSelector}
          onOpenChange={setShowDirectionSelector}
          value={sort.desc ? 'desc' : 'asc'}
          onValueChange={(value: SortDirection) =>
            onSortUpdate(sort.id, { desc: value === 'desc' })
          }
        >
          <SelectTrigger aria-controls={directionListboxId} className="h-8 w-24 [&[data-size]]:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            id={directionListboxId}
            className="min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)]"
          >
            {dataTableConfig.sortOrders.map((order: any) => (
              <SelectItem key={order.value} value={order.value}>
                {order.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-controls={sortItemId}
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onSortRemove(sort.id)}
        >
          <Trash2 className="size-4" />
        </Button>
        <SortableItemHandle asChild>
          <Button variant="outline" size="icon" className="size-8 shrink-0">
            <GripVertical className="size-4" />
          </Button>
        </SortableItemHandle>
      </div>
    </SortableItem>
  );
}
