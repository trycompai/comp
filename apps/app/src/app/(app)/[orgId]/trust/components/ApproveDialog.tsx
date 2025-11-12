import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Button } from '@trycompai/ui/button';
import { useAccessRequest, useApproveAccessRequest } from '@/hooks/use-access-requests';
import { ScopesSelect } from './ScopesSelect';
import { DurationPicker } from './DurationPicker';
import { toast } from 'sonner';

export function ApproveDialog({
  orgId,
  requestId,
  onClose,
}: {
  orgId: string;
  requestId: string;
  onClose: () => void;
}) {
  const { data } = useAccessRequest(orgId, requestId);
  const { mutateAsync: approveRequest } = useApproveAccessRequest(orgId);
  const [scopes, setScopes] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(30);

  useEffect(() => {
    if (data) {
      setScopes(data.requestedScopes || []);
      setDurationDays(data.requestedDurationDays || 30);
    }
  }, [data]);

  const handleApprove = () => {
    toast.promise(approveRequest(requestId), {
      loading: 'Approving...',
      success: () => {
        onClose();
        return 'Request approved. NDA email sent.';
      },
      error: 'Failed to approve request',
    });
  };

  if (!data) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve Access Request</DialogTitle>
          <DialogDescription>
            Review and configure access parameters before sending NDA
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Name</div>
              <div>{data.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
              <div>{data.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Company</div>
              <div>{data.company || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Job Title</div>
              <div>{data.jobTitle || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Purpose</div>
              <div>{data.purpose || '-'}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Access Scopes</div>
              <ScopesSelect value={scopes} onChange={setScopes} />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Duration</div>
              <DurationPicker value={durationDays} onChange={setDurationDays} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={scopes.length === 0}>
            Approve & Send NDA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
