'use client';

import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { T, Branch, useGT } from 'gt-next';

type Props = {
  hasFilters?: boolean;
};

export function NoResults({ hasFilters }: Props) {
  const router = useRouter();
  const { orgId, riskId } = useParams<{ orgId: string; riskId: string }>();
  const t = useGT();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icons.Transactions2 className="mb-4" />
        <div className="mb-6 space-y-2 text-center">
          <T>
            <h2 className="text-lg font-medium">No results found</h2>
            <p className="text-muted-foreground text-sm">
              <Branch
                branch={(hasFilters || false).toString()}
                true={<>Try another search, or adjusting the filters</>}
                false={<>Create a task to get started</>}
              />
            </p>
          </T>
        </div>

        {hasFilters && (
          <Button variant="outline" onClick={() => router.push(`/${orgId}/risk/${riskId}`)}>
            {t('Clear filters')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoTasks({ isEmpty }: { isEmpty: boolean }) {
  const [open, setOpen] = useQueryState('create-task-sheet');
  const t = useGT();

  return (
    <div className="absolute top-0 left-0 z-20 flex w-full items-center justify-center">
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
        <T>
          <h2 className="mb-2 text-xl font-medium">No tasks found</h2>
          <p className="text-muted-foreground mb-6 text-sm">Create a task to get started</p>
        </T>
        <Button onClick={() => setOpen('true')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Create')}
        </Button>
      </div>
    </div>
  );
}
