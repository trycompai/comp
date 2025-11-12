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
import { useDenyAccessRequest } from '@/hooks/use-access-requests';
import { toast } from 'sonner';

export function DenyDialog({
  orgId,
  requestId,
  onClose,
}: {
  orgId: string;
  requestId: string;
  onClose: () => void;
}) {
  const { mutateAsync: denyRequest } = useDenyAccessRequest(orgId);
  const [reason, setReason] = useState('');

  const handleDeny = () => {
    toast.promise(denyRequest({ requestId, reason }), {
      loading: 'Denying...',
      success: () => {
        onClose();
        return 'Request denied';
      },
      error: 'Failed to deny request',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deny Access Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for denying this request
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for denial..."
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeny}>
            Deny Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
