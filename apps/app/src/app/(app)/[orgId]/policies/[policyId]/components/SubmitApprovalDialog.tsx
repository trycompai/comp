'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Member, User } from '@db';
import { Loader2 } from 'lucide-react';

interface SubmitApprovalDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignees: (Member & { user: User })[];
  selectedApproverId: string | null;
  onSelectedApproverIdChange: (id: string | null) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export const SubmitApprovalDialog = ({
  isOpen,
  onOpenChange,
  assignees,
  selectedApproverId,
  onSelectedApproverIdChange,
  onConfirm,
  isSubmitting,
}: SubmitApprovalDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>Please select an approver for this policy.</DialogDescription>
        </DialogHeader>
        <SelectAssignee
          assignees={assignees}
          assigneeId={selectedApproverId}
          onAssigneeChange={onSelectedApproverIdChange}
          withTitle={false}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !selectedApproverId}>
            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
