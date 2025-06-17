'use client';

import type { Column } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentProps<typeof DropdownMenuTrigger> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'hover:bg-accent focus:ring-ring data-[state=open]:bg-accent [&_svg]:text-muted-foreground -ml-1.5 flex h-8 items-center gap-1.5 px-2 py-1.5 focus:ring-1 focus:outline-hidden [&_svg]:size-4 [&_svg]:shrink-0',
          className,
        )}
        {...props}
      >
        {title}
        {column.getCanSort() &&
          (() => {
            try {
              const sortDirection = column.getIsSorted();
              if (sortDirection === 'desc') {
                return <ChevronDown className="size-4" />;
              }
              if (sortDirection === 'asc') {
                return <ChevronUp className="size-4" />;
              }
              return <ChevronsUpDown className="size-4" />;
            } catch (e) {
              // If there's an error with sorting state, show the default unsorted icon
              return <ChevronsUpDown className="size-4" />;
            }
          })()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28">
        {column.getCanSort() && (
          <>
            <DropdownMenuCheckboxItem
              className="[&_svg]:text-muted-foreground relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
              checked={(() => {
                try {
                  return column.getIsSorted() === 'asc';
                } catch (e) {
                  return false;
                }
              })()}
              onClick={() => {
                try {
                  column.toggleSorting(false);
                } catch (e) {
                  console.error('Error toggling sort:', e);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <ChevronUp className="size-4" />
                Ascend
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="[&_svg]:text-muted-foreground relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
              checked={(() => {
                try {
                  return column.getIsSorted() === 'desc';
                } catch (e) {
                  return false;
                }
              })()}
              onClick={() => {
                try {
                  column.toggleSorting(true);
                } catch (e) {
                  console.error('Error toggling sort:', e);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className="size-4" />
                Descend
              </div>
            </DropdownMenuCheckboxItem>
            {(() => {
              try {
                if (column.getIsSorted()) {
                  return (
                    <DropdownMenuItem
                      className="[&_svg]:text-muted-foreground pl-2"
                      onClick={() => {
                        try {
                          column.clearSorting();
                        } catch (e) {
                          console.error('Error clearing sort:', e);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <X className="size-4" />
                        Reset
                      </div>
                    </DropdownMenuItem>
                  );
                }
                return null;
              } catch (e) {
                return null;
              }
            })()}
          </>
        )}
        {/* {column.getCanHide() && (
					<DropdownMenuCheckboxItem
						className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
						checked={!column.getIsVisible()}
						onClick={() => column.toggleVisibility(false)}
					>
						<div className="flex items-center gap-2">
							<EyeOff className="size-4" />
							Hide
						</div>
					</DropdownMenuCheckboxItem>
				)} */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
