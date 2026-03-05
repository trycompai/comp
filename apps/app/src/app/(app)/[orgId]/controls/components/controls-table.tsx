'use client';

import * as React from 'react';

import {
  Button,
  DataTableFilters,
  DataTableHeader,
  DataTableSearch,
  HStack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ArrowDown, ArrowUp } from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ControlWithRelations } from '../data/queries';
import { StatusIndicator } from '@/components/status-indicator';
import { getControlStatus } from '../lib/utils';
import { usePermissions } from '@/hooks/use-permissions';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface ControlsTableProps {
  promises: Promise<[{ data: ControlWithRelations[]; pageCount: number }]>;
}

type SortDirection = 'asc' | 'desc';

function SortIcon({ direction }: { direction: SortDirection }) {
  return direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
}

export function ControlsTable({ promises }: ControlsTableProps) {
  const [{ data }] = React.use(promises);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = React.useState('');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredControls = React.useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    const filtered = lowerSearch
      ? data.filter((control) => control.name.toLowerCase().includes(lowerSearch))
      : data;
    const sorted = [...filtered].sort((left, right) =>
      sortDirection === 'asc'
        ? left.name.localeCompare(right.name)
        : right.name.localeCompare(left.name),
    );
    return sorted;
  }, [data, search, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredControls.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedControls = filteredControls.slice(startIndex, startIndex + pageSize);

  // Keep page in bounds when pageCount changes
  React.useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleSortByName = React.useCallback(() => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleOpenCreateControl = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('create-control', 'true');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const handleViewControl = React.useCallback(
    (controlId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      router.push(`${pathname}/${controlId}${params.toString() ? `?${params.toString()}` : ''}`);
    },
    [pathname, router, searchParams],
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, controlId: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleViewControl(controlId);
      }
    },
    [handleViewControl],
  );

  const handlePageSizeChange = React.useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <DataTableHeader>
        <DataTableSearch placeholder="Search controls..." value={search} onChange={setSearch} />
        <DataTableFilters>
          {hasPermission('control', 'create') && (
            <Button onClick={handleOpenCreateControl}>Create Control</Button>
          )}
        </DataTableFilters>
      </DataTableHeader>
      <Table
        variant="bordered"
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageSizeChange: handlePageSizeChange,
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>
              <HStack gap="xs" align="center" style={{ cursor: 'pointer' }} onClick={handleSortByName}>
                <span>Control Name</span>
                <SortIcon direction={sortDirection} />
              </HStack>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedControls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            paginatedControls.map((control) => (
              <TableRow
                key={control.id}
                role="button"
                tabIndex={0}
                onClick={() => handleViewControl(control.id)}
                onKeyDown={(event) => handleRowKeyDown(event, control.id)}
              >
                <TableCell>
                  <Text size="sm" weight="medium">
                    {control.name}
                  </Text>
                </TableCell>
                <TableCell>
                  <StatusIndicator status={getControlStatus(control)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
