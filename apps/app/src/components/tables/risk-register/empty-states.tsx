'use client';

import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { T, useGT } from 'gt-next';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

type Props = {
  hasFilters?: boolean;
};

export function NoResults({ hasFilters }: Props) {
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const t = useGT();

  return (
    <div className="mt-24 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icons.Transactions2 className="mb-4" />
        <div className="mb-6 space-y-2 text-center">
          <T>
            <h2 className="text-lg font-medium">No results found</h2>
          </T>
          <T>
            <p className="text-muted-foreground text-sm">
              Try another search, or adjusting the filters
            </p>
          </T>
        </div>

        {hasFilters && (
          <Button variant="outline" onClick={() => router.push(`/${orgId}/risk/register`)}>
            {t('Clear')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoRisks() {
  const [open, setOpen] = useQueryState('create-risk-sheet');
  const t = useGT();

  return (
    <div className="absolute top-0 left-0 z-20 mt-24 flex w-full items-center justify-center">
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
        <T>
          <h2 className="mb-2 text-xl font-medium">No risks yet</h2>
        </T>
        <T>
          <p className="text-muted-foreground mb-6 text-sm">
            Get started by creating your first risk
          </p>
        </T>
        <Button onClick={() => setOpen('true')} className="flex">
          <Plus className="mr-2 h-4 w-4" />
          {t('Create')}
        </Button>
      </div>

      <CreateRiskSheet assignees={[]} />
    </div>
  );
}
