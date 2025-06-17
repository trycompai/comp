'use client';

import { cn } from '@comp/ui/cn';
import { Skeleton } from '@comp/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@comp/ui/table';
import { Suspense } from 'react';
import { DataTableHeader } from './data-table-header';

const data = [...Array(10)].map((_, i) => ({ id: i.toString() }));

export function Loading({ isEmpty }: { isEmpty: boolean }) {
  return (
    <Suspense fallback={<Loading isEmpty={false} />}>
      <div className="w-full overflow-auto">
        <Table className={cn(isEmpty && 'pointer-events-none opacity-20 blur-[7px]')}>
          <DataTableHeader loading />

          <TableBody>
            {data?.map((row) => (
              <TableRow key={row.id} className="h-[45px]">
                <TableCell className="w-[300px]">
                  <Skeleton className={cn('h-3.5 w-[80%]', isEmpty && 'animate-none')} />
                </TableCell>
                <TableCell className="hidden w-[120px] md:table-cell">
                  <Skeleton className={cn('h-3.5 w-[70%]', isEmpty && 'animate-none')} />
                </TableCell>
                <TableCell className="hidden w-[400px] md:table-cell">
                  <Skeleton className={cn('h-3.5 w-[90%]', isEmpty && 'animate-none')} />
                </TableCell>
                <TableCell className="hidden w-[150px] md:table-cell">
                  <Skeleton className={cn('h-3.5 w-[60%]', isEmpty && 'animate-none')} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Suspense>
  );
}
