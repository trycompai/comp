'use client';

import { regeneratePolicyAction } from '@/app/(app)/[orgId]/policies/[policyId]/actions/regenerate-policy';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Icons } from '@comp/ui/icons';
import { Policy } from '@db';
import { FileJson, FileText } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { switchPolicyDisplayFormatAction } from '../actions/switch-policy-display-format';

export function PolicyHeaderActions({ policy }: { policy: Policy | null }) {
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [isSwitchConfirmOpen, setSwitchConfirmOpen] = useState(false);

  const regenerate = useAction(regeneratePolicyAction, {
    onSuccess: () => toast.success('Regeneration triggered. This may take a moment.'),
    onError: () => toast.error('Failed to trigger policy regeneration'),
  });

  const switchFormat = useAction(switchPolicyDisplayFormatAction, {
    onSuccess: () => toast.success('View switched successfully.'),
    onError: () => toast.error('Failed to switch view.'),
  });

  if (!policy) return null;

  const isPendingApproval = !!policy.approverId;

  const isPdfView = policy.displayFormat === 'PDF';
  const newFormat = isPdfView ? 'EDITOR' : 'PDF';

  const handleSwitchFormat = () => {
    switchFormat.execute({ policyId: policy.id, format: newFormat });
    setSwitchConfirmOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="m-0 size-auto p-2">
            <Icons.Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRegenerateConfirmOpen(true)} disabled={isPendingApproval}>
            <Icons.AI className="mr-2 h-4 w-4" /> Regenerate policy
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('policy-overview-sheet', 'true');
              window.history.pushState({}, '', url.toString());
            }}
          >
            <Icons.Edit className="mr-2 h-4 w-4" /> Edit policy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSwitchConfirmOpen(true)} disabled={isPendingApproval}>
            {isPdfView ? <FileJson className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
            Switch to {isPdfView ? 'Editor' : 'PDF'} View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('archive-policy-sheet', 'true');
              window.history.pushState({}, '', url.toString());
            }}
          >
            <Icons.InboxCustomize className="mr-2 h-4 w-4" /> Archive / Restore
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('delete-policy', 'true');
              window.history.pushState({}, '', url.toString());
            }}
            className="text-destructive"
          >
            <Icons.Delete className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Policy</DialogTitle>
            <DialogDescription>
              This will generate new policy content using your org context and frameworks and mark
              it for review. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                regenerate.execute({ policyId: policy.id });
                setRegenerateConfirmOpen(false);
              }}
              disabled={regenerate.status === 'executing'}
            >
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwitchConfirmOpen} onOpenChange={setSwitchConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {newFormat === 'EDITOR' ? 'Editor' : 'PDF'} View</DialogTitle>
            <DialogDescription>
              Are you sure? The current{' '}
              <span className="font-semibold">{isPdfView ? 'PDF document' : 'editor content'}</span>{' '}
              will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwitchConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSwitchFormat}
              disabled={switchFormat.status === 'executing'}
            >
              {switchFormat.status === 'executing' ? 'Switching…' : 'Confirm & Switch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
