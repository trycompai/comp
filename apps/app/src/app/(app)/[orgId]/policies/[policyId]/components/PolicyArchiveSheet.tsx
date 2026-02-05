'use client';

import { useApi } from '@/hooks/use-api';
import { useMediaQuery } from '@comp/ui/hooks';
import type { Policy } from '@db';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  HStack,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Archive, Renew } from '@trycompai/design-system/icons';
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

    await onMutate?.();

    if (shouldArchive) {
      toast.success('Policy archived successfully');
      router.push(`/${policy.organizationId}/policies`);
    } else {
      toast.success('Policy restored successfully');
    }
    handleOpenChange(false);
  };

  const content = (
    <Stack gap="lg">
      <Text size="sm" variant="muted">
        {isArchived
          ? 'Are you sure you want to restore this policy?'
          : 'Are you sure you want to archive this policy?'}
      </Text>
      <HStack justify="end" gap="sm">
        <Button
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant={isArchived ? 'default' : 'destructive'}
          onClick={handleAction}
          disabled={isSubmitting}
          loading={isSubmitting}
          iconLeft={isArchived ? <Renew size={14} /> : <Archive size={14} />}
        >
          {isArchived ? 'Restore' : 'Archive'}
        </Button>
      </HStack>
    </Stack>
  );

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{isArchived ? 'Restore Policy' : 'Archive Policy'}</SheetTitle>
            <SheetDescription>{policy.name}</SheetDescription>
          </SheetHeader>
          <SheetBody>{content}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isArchived ? 'Restore Policy' : 'Archive Policy'}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <Stack gap="md">
            <Text size="sm" variant="muted">
              {policy.name}
            </Text>
            {content}
          </Stack>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
