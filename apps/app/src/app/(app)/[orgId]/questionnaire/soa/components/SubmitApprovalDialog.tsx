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
import { SelectAssignee } from '@/components/SelectAssignee';
import { Loader2 } from 'lucide-react';
import { Member, User } from '@db';

interface SubmitApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerAdminMembers: (Member & { user: User })[];
  selectedApproverId: string | null;
  onApproverChange: (id: string | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function SubmitApprovalDialog({
  open,
  onOpenChange,
  ownerAdminMembers,
  selectedApproverId,
  onApproverChange,
  onSubmit,
  isSubmitting,
}: SubmitApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>Please select an approver for this SOA document.</DialogDescription>
        </DialogHeader>
        <SelectAssignee
          assignees={ownerAdminMembers}
          assigneeId={selectedApproverId}
          onAssigneeChange={onApproverChange}
          withTitle={false}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !selectedApproverId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm & Submit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

