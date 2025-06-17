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
                <TableCell className="w-[50px]">
                  <Skeleton className={cn('h-3.5 w-[15px]', isEmpty && 'animate-none')} />
                </TableCell>

                <TableCell className="w-[300px]">
                  <Skeleton className={cn('h-3.5 w-[80%]', isEmpty && 'animate-none')} />
                </TableCell>
                <TableCell className="hidden w-[200px] sm:table-cell">
                  <Skeleton className={cn('h-3.5 w-[70%]', isEmpty && 'animate-none')} />
                </TableCell>
                <TableCell className="hidden w-[150px] sm:table-cell">
                  <Skeleton className={cn('h-3.5 w-[60%]', isEmpty && 'animate-none')} />
                </TableCell>

                <TableCell className="w-[100px]">
                  <Skeleton
                    className={cn('h-[20px] w-[20px] rounded-full', isEmpty && 'animate-none')}
                  />
                </TableCell>
                <TableCell className="w-[50px]" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Suspense>
  );
}
