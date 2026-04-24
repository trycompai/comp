'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useRevokeAgentAccess } from '../hooks/useRevokeAgentAccess';

interface RevokeAgentAccessDialogProps {
  deviceId: string;
  deviceName: string;
}

export function RevokeAgentAccessDialog({
  deviceId,
  deviceName,
}: RevokeAgentAccessDialogProps) {
  const { hasPermission } = usePermissions();
  const { revokeAgentAccess } = useRevokeAgentAccess();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hasPermission('member', 'update')) {
    return null;
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await revokeAgentAccess(deviceId);
      toast.success('Agent access revoked.');
      setOpen(false);
    } catch (err) {
      toast.error(
        `Could not revoke agent access: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Revoke agent access
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke agent access on {deviceName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The agent on this device will sign out on its next check-in. The user
            will need to sign in again to resume reporting compliance. This does
            not affect the user&apos;s web sessions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            Revoke
          </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
