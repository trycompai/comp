'use client';

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
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Icons } from '@comp/ui/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePolicyActions } from '../hooks/usePolicyActions';
import { usePermissions } from '@/hooks/use-permissions';

export function FullPolicyHeaderActions() {
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { regenerateAll } = usePolicyActions();
  const { hasPermission } = usePermissions();

  if (!hasPermission('policy', 'update')) return null;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateAll();
      toast.success('Policy regeneration started. This may take a few minutes.');
      setRegenerateConfirmOpen(false);
    } catch {
      toast.error('Failed to regenerate policies');
    } finally {
      setIsRegenerating(false);
    }
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
          <DropdownMenuItem onClick={() => setRegenerateConfirmOpen(true)}>
            <Icons.AI className="mr-2 h-4 w-4" /> Regenerate all policies
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate All Policies</DialogTitle>
            <DialogDescription>
              This will generate new policy content for all policies using your org context and
              frameworks. It will delete all existing versions and their PDFs for each policy. This
              cannot be undone. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateConfirmOpen(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={isRegenerating}>
              {isRegenerating ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
