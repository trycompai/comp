'use client';

import { Button } from '@comp/ui/button';
import { TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { useGT } from 'gt-next';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type Props = {
  table?: {
    getIsAllPageRowsSelected: () => boolean;
    getIsSomePageRowsSelected: () => boolean;
    getAllLeafColumns: () => {
      id: string;
      getIsVisible: () => boolean;
    }[];
    toggleAllPageRowsSelected: (value: boolean) => void;
  };
  loading?: boolean;
  isEmpty?: boolean;
};

export function DataTableHeader({ table, loading }: Props) {
  const t = useGT();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sortParam = searchParams.get('sort');
  const [column, value] = sortParam ? sortParam.split(':') : [];

  const createSortQuery = useCallback(
    (name: string) => {
      const params = new URLSearchParams(searchParams);
      const prevSort = params.get('sort');

      if (`${name}:asc` === prevSort) {
        params.set('sort', `${name}:desc`);
      } else if (`${name}:desc` === prevSort) {
        params.delete('sort');
      } else {
        params.set('sort', `${name}:asc`);
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const isVisible = (id: string) =>
    loading ||
    table
      ?.getAllLeafColumns()
      .find((col) => col.id === id)
      ?.getIsVisible();

  return (
    <TableHeader>
      <TableRow className="h-[45px] hover:bg-transparent">
        {isVisible('name') && (
          <TableHead className="min-w-[120px] px-3 py-2 md:px-4">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => createSortQuery('name')}
            >
              <span>{t('Policy Name')}</span>
              {'name' === column && value === 'asc' && <ArrowDown size={16} />}
              {'name' === column && value === 'desc' && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible('status') && (
          <TableHead className="hidden min-w-[120px] px-3 py-2 md:table-cell md:px-4">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => createSortQuery('status')}
            >
              <span>{t('Status')}</span>
              {'status' === column && value === 'asc' && <ArrowDown size={16} />}
              {'status' === column && value === 'desc' && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}

        {isVisible('updatedAt') && (
          <TableHead className="hidden min-w-[120px] px-3 py-2 md:table-cell md:px-4">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => createSortQuery('updatedAt')}
            >
              <span>{t('Last Updated')}</span>
              {'updatedAt' === column && value === 'asc' && <ArrowDown size={16} />}
              {'updatedAt' === column && value === 'desc' && <ArrowUp size={16} />}
            </Button>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}
