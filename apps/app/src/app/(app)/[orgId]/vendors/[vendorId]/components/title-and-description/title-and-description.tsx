'use client';

import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Icons } from '@comp/ui/icons';
import type { User, Vendor } from '@db';
import { Button } from '@trycompai/design-system';
import { Edit } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { UpdateTitleAndDescriptionSheet } from './update-title-and-description-sheet';

export function TitleAndDescription({
  vendor,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Alert>
        <Icons.Risk className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {vendor.name}
            <Button size="icon-xs" variant="ghost" onClick={() => setIsOpen(true)}>
              <Edit size={12} />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">{vendor.description}</AlertDescription>
      </Alert>
      <UpdateTitleAndDescriptionSheet vendor={vendor} open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
