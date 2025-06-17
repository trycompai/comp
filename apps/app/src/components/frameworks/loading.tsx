'use client';

import { cn } from '@comp/ui/cn';
import { Skeleton } from '@comp/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@comp/ui/table';
import { DataTableHeader } from '../tables/risk-tasks/data-table-header';

export function Loading({ isEmpty, amount }: { isEmpty: boolean; amount?: number }) {
  const data = [...Array(amount || 10)].map((_, i) => ({ id: i.toString() }));

  return (
    <div className="w-full overflow-auto">
      <Table className={cn(isEmpty && 'pointer-events-none opacity-20 blur-[7px]')}>
        <DataTableHeader loading />

        <TableBody>
          {data?.map((row) => (
            <TableRow key={row.id} className="h-[45px]">
              <TableCell className="w-[300px]">
                <Skeleton className={cn('h-3.5 w-[80%]', isEmpty && 'animate-none')} />
              </TableCell>
              <TableCell className="w-[200px]">
                <Skeleton className={cn('h-3.5 w-[70%]', isEmpty && 'animate-none')} />
              </TableCell>
              <TableCell className="w-[150px]">
                <Skeleton className={cn('h-3.5 w-[60%]', isEmpty && 'animate-none')} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
