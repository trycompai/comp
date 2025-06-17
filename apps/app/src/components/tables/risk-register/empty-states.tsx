'use client';

import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

type Props = {
  hasFilters?: boolean;
};

export function NoResults({ hasFilters }: Props) {
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <div className="mt-24 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icons.Transactions2 className="mb-4" />
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">{'No results found'}</h2>
          <p className="text-muted-foreground text-sm">
            {'Try another search, or adjusting the filters'}
          </p>
        </div>

        {hasFilters && (
          <Button variant="outline" onClick={() => router.push(`/${orgId}/risk/register`)}>
            {'Clear'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoRisks() {
  const [open, setOpen] = useQueryState('create-risk-sheet');

  return (
    <div className="absolute top-0 left-0 z-20 mt-24 flex w-full items-center justify-center">
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-xl font-medium">{'No risks yet'}</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {'Get started by creating your first risk'}
        </p>
        <Button onClick={() => setOpen('true')} className="flex">
          <Plus className="mr-2 h-4 w-4" />
          {'Create'}
        </Button>
      </div>

      <CreateRiskSheet assignees={[]} />
    </div>
  );
}
