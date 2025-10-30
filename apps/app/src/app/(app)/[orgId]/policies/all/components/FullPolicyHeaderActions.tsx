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
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { regenerateFullPoliciesAction } from '../actions/regenerate-full-policies';

export function FullPolicyHeaderActions() {
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const regenerate = useAction(regenerateFullPoliciesAction, {
    onSuccess: () => {
      toast.success('Policy regeneration started. This may take a few minutes.');
      setRegenerateConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error.error.serverError || 'Failed to regenerate policies');
    },
  });

  const handleRegenerate = async () => {
    await regenerate.execute({});
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
              frameworks. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateConfirmOpen(false)}
              disabled={regenerate.status === 'executing'}
            >
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={regenerate.status === 'executing'}>
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
