'use client';

import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Branch, T, useGT } from 'gt-next';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

type Props = {
  hasFilters?: boolean;
};

export function NoResults({ hasFilters }: Props) {
  const router = useRouter();
  const t = useGT();
  const { orgId, vendorId } = useParams<{
    orgId: string;
    vendorId: string;
  }>();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icons.Transactions2 className="mb-4" />
        <T>
          <div className="mb-6 space-y-2 text-center">
            <h2 className="text-lg font-medium">No results found</h2>
            <p className="text-muted-foreground text-sm">
              <Branch
                branch={hasFilters?.toString() || 'false'}
                true={<>Try another search, or adjusting the filters</>}
                false={<>Create a task to get started</>}
              />
            </p>
          </div>
        </T>

        {hasFilters && (
          <Button variant="outline" onClick={() => router.push(`/${orgId}/vendors/${vendorId}`)}>
            {t('Clear filters')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoTasks({ isEmpty }: { isEmpty: boolean }) {
  const [_, setOpen] = useQueryState('create-vendor-task-sheet');
  const t = useGT();

  return (
    <div className="absolute top-0 left-0 z-20 flex w-full items-center justify-center">
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
        <T>
          <h2 className="mb-2 text-xl font-medium">No tasks found</h2>
        </T>
        <T>
          <p className="text-muted-foreground mb-6 text-sm">Create a task to get started</p>
        </T>
        <Button onClick={() => setOpen('true')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Create')}
        </Button>
      </div>

      {/* <CreateVendorTaskSheet assignees={[]} /> */}
    </div>
  );
}
