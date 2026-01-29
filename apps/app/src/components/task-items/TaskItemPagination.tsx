'use client';

import {
  Button,
  HStack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@trycompai/design-system';
import { ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';

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
    <HStack justify="between" align="center" wrap="wrap" gap="sm">
      <HStack gap="sm" align="center" wrap="wrap">
        <Text size="sm" variant="muted">
          {total} {total === 1 ? 'task' : 'tasks'}
        </Text>
        <HStack gap="xs" align="center">
          <Select value={limit.toString()} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={`${limit}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text size="sm" variant="muted">
            per page
          </Text>
        </HStack>
      </HStack>

      <HStack gap="xs" align="center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Text size="sm" weight="medium">
          Page {page} of {totalPages}
        </Text>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </HStack>
    </HStack>
  );
}

