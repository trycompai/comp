'use client';

import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import type { User, Vendor } from '@db';
import { PencilIcon } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { UpdateTitleAndDescriptionSheet } from './update-title-and-description-sheet';

export function TitleAndDescription({
  vendor,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
}) {
  const [_, setOpen] = useQueryState('vendor-overview-sheet');

  return (
    <div className="space-y-4">
      <Alert>
        <Icons.Risk className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {vendor.name}
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0"
              onClick={() => setOpen('true')}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">{vendor.description}</AlertDescription>
      </Alert>
      <UpdateTitleAndDescriptionSheet vendor={vendor} />
    </div>
  );
}
