import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Button } from '@trycompai/ui/button';
import { Textarea } from '@trycompai/ui/textarea';
import { useRevokeAccessGrant } from '@/hooks/use-access-requests';
import { toast } from 'sonner';

export function RevokeDialog({
  orgId,
  grantId,
  onClose,
}: {
  orgId: string;
  grantId: string;
  onClose: () => void;
}) {
  const { mutateAsync: revokeGrant } = useRevokeAccessGrant(orgId);
  const [reason, setReason] = useState('');

  const handleRevoke = () => {
    toast.promise(revokeGrant({ grantId, reason }), {
      loading: 'Revoking...',
      success: () => {
        onClose();
        return 'Grant revoked';
      },
      error: 'Failed to revoke grant',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Access Grant</DialogTitle>
          <DialogDescription>
            Please provide a reason for revoking this grant
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for revocation..."
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke}>
            Revoke Grant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
