'use client';

import { useApi } from '@/hooks/use-api';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Policy } from '@db';
import { ArchiveIcon, ArchiveRestoreIcon, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { toast } from 'sonner';

export function PolicyArchiveSheet({ policy, onMutate }: { policy: Policy; onMutate?: () => void }) {
  const api = useApi();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('archive-policy-sheet');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOpen = Boolean(open);
  const isArchived = policy.isArchived;

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? 'true' : null);
  };

  const handleAction = async () => {
    const shouldArchive = !isArchived;
    setIsSubmitting(true);
    const response = await api.patch(`/v1/policies/${policy.id}`, {
      isArchived: shouldArchive,
    });
    setIsSubmitting(false);

    if (response.error) {
      toast.error('Failed to update policy archive status');
      return;
    }

    if (shouldArchive) {
      toast.success('Policy archived successfully');
      router.push(`/${policy.organizationId}/policies`);
    } else {
      toast.success('Policy restored successfully');
      onMutate?.();
    }
    handleOpenChange(false);
  };

  const content = (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {isArchived
          ? 'Are you sure you want to restore this policy?'
          : 'Are you sure you want to archive this policy?'}
      </p>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={isSubmitting}
        >
          {'Cancel'}
        </Button>
        <Button
          variant={isArchived ? 'default' : 'destructive'}
          onClick={handleAction}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {isArchived ? 'Restore' : 'Archive'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {isArchived ? (
                <>
                  <ArchiveRestoreIcon className="h-3 w-3" />
                  {'Restore'}
                </>
              ) : (
                <>
                  <ArchiveIcon className="h-3 w-3" />
                  {'Archive'}
                </>
              )}
            </span>
          )}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader className="mb-6">
            <div className="flex flex-row items-center justify-between">
              <SheetTitle>{isArchived ? 'Restore Policy' : 'Archive Policy'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription>{policy.name}</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{isArchived ? 'Restore Policy' : 'Archive Policy'}</DrawerTitle>
      <DrawerContent className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">
            {isArchived ? 'Restore Policy' : 'Archive Policy'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">{policy.name}</p>
        </div>
        {content}
      </DrawerContent>
    </Drawer>
  );
}
