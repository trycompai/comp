'use client';

import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFrameworkUpdatePreview } from '@/hooks/use-framework-update-preview';
import { useFrameworkUpdateStatus } from '@/hooks/use-framework-update-status';
import { useFrameworkSync } from '@/hooks/use-framework-sync';
import { UpdateReviewSections } from './UpdateReviewSections';
import { SyncConfirmDialog } from './SyncConfirmDialog';

interface UpdateReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkInstanceId: string;
}

export function UpdateReviewSheet({
  open,
  onOpenChange,
  frameworkInstanceId,
}: UpdateReviewSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status } = useFrameworkUpdateStatus(frameworkInstanceId);
  const {
    data: preview,
    isLoading,
    error,
  } = useFrameworkUpdatePreview(frameworkInstanceId, {
    enabled: open,
  });

  const { sync, isSyncing } = useFrameworkSync(frameworkInstanceId);

  const handleClose = () => {
    if (!isSyncing) {
      onOpenChange(false);
    }
  };

  const handleConfirmSync = async () => {
    if (!status?.latestVersion?.id) return;
    try {
      await sync(status.latestVersion.id);
      toast.success(
        `Framework synced to v${status.latestVersion.version}`,
      );
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to sync framework',
      );
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>
                {status?.latestVersion
                  ? `Update to v${status.latestVersion.version}`
                  : 'Framework update'}
              </SheetTitle>
              <Button size="icon" variant="ghost" onClick={handleClose}>
                <Close size={20} />
              </Button>
            </div>
          </SheetHeader>
          <SheetBody>
            <Stack gap="4">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              )}
              {error && (
                <Text variant="muted">
                  Failed to load update preview. Please try again.
                </Text>
              )}
              {preview && !isLoading && (
                <>
                  <UpdateReviewSections preview={preview} />
                  <div>
                    <Button
                      variant="default"
                      onClick={() => setConfirmOpen(true)}
                      disabled={isSyncing}
                    >
                      Apply update
                    </Button>
                  </div>
                </>
              )}
            </Stack>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {preview && (
        <SyncConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          preview={preview}
          isSyncing={isSyncing}
          onConfirm={handleConfirmSync}
        />
      )}
    </>
  );
}
