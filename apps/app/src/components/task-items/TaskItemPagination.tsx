'use client';

import { Button } from '@comp/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskItemPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function TaskItemPagination({
  page,
  limit,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onLimitChange,
}: TaskItemPaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span className="hidden sm:inline">{total} {total === 1 ? 'task' : 'tasks'}</span>
        <div className="hidden items-center gap-2 sm:flex">
          <Select value={limit.toString()} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          Page {page} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

