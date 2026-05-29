'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Checkmark, CloseOutline, WarningAlt } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsDocument } from '../isms-types';

export interface ApproverOption {
  id: string;
  name: string;
}

interface IsmsApprovalSectionProps {
  document: IsmsDocument;
  canManage: boolean;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  onSubmitForApproval: (approverId: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export function IsmsApprovalSection({
  document,
  canManage,
  currentMemberId,
  approverOptions,
  onSubmitForApproval,
  onApprove,
  onDecline,
}: IsmsApprovalSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const isPending = document.status === 'needs_review';
  const canCurrentUserApprove =
    isPending && !!document.approverId && document.approverId === currentMemberId;
  const approverName =
    approverOptions.find((option) => option.id === document.approverId)?.name ?? 'an approver';

  const handleSubmit = async () => {
    if (!selectedApproverId) return;
    setIsSubmitting(true);
    try {
      await onSubmitForApproval(selectedApproverId);
      setIsDialogOpen(false);
      setSelectedApproverId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await onDecline();
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isPending && (
        <Alert variant="default" icon={<WarningAlt />}>
          <AlertTitle>
            {canCurrentUserApprove ? 'Action Required by You' : 'Pending Approval'}
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <div>
                This document is awaiting approval from{' '}
                <span className="font-semibold">
                  {document.approverId === currentMemberId ? 'you' : approverName}
                </span>
                .
              </div>
              {canCurrentUserApprove && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApprove}
                    disabled={isApproving || isDeclining}
                    loading={isApproving}
                    iconLeft={<Checkmark size={16} />}
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={isApproving || isDeclining}
                    loading={isDeclining}
                    iconLeft={<CloseOutline size={16} />}
                  >
                    {isDeclining ? 'Declining...' : 'Decline'}
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {canManage && !isPending && (
        <div className="flex justify-start">
          <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(true)}>
            Submit for approval
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
            <DialogDescription>Select an approver for this document.</DialogDescription>
          </DialogHeader>
          <Select
            value={selectedApproverId ?? undefined}
            onValueChange={(value) => setSelectedApproverId(value)}
          >
            <SelectTrigger aria-label="Approver">
              <SelectValue placeholder="Select an approver" />
            </SelectTrigger>
            <SelectContent>
              {approverOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedApproverId}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
