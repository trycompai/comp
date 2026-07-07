'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  ApprovalBanner,
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
  Text,
} from '@trycompai/design-system';
import { Time } from '@trycompai/design-system/icons';
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

/** Format an ISO timestamp as a short human date, or null when unparseable. */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  const { status } = document;
  const isPending = status === 'needs_review';
  const isApproved = status === 'approved';
  const isDeclined = status === 'declined';
  const isResolved = isApproved || isDeclined;
  const canCurrentUserApprove =
    isPending && !!document.approverId && document.approverId === currentMemberId;
  const approverName =
    approverOptions.find((option) => option.id === document.approverId)?.name ?? 'an approver';
  const approvedDate = formatDate(document.approvedAt);
  const declinedDate = formatDate(document.declinedAt);

  // Versioning context (CS-701): a published version can stay live while the
  // draft is edited. `hasDraftChanges` = a published version exists but the
  // working draft is no longer approved (edits in progress).
  const publishedVersion = document.currentVersion?.version ?? null;
  const hasPublishedVersion = publishedVersion != null;
  const nextDraftVersion = (publishedVersion ?? 0) + 1;
  const hasDraftChanges =
    hasPublishedVersion && (isDeclined || (!isApproved && !isPending));

  // The plain submit button is only offered on un-submitted drafts. Pending and
  // resolved (approved / declined) documents render their own state instead.
  const showSubmitButton = canManage && !isPending && !isResolved;
  // A declined document can be re-submitted, but via an explicit action that
  // sits inside the declined state — never the bare "Submit for approval".
  const showResubmitButton = canManage && isDeclined;

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

  return (
    <div className="flex flex-col gap-3">
      {isApproved && (
        <Alert variant="success">
          <AlertTitle>
            Approved{publishedVersion ? ` · Published as v${publishedVersion}` : ''}
          </AlertTitle>
          <AlertDescription>
            This document was approved by{' '}
            <Text as="span" size="sm" weight="medium">
              {approverName}
            </Text>
            {approvedDate ? ` on ${approvedDate}` : ''}.
          </AlertDescription>
        </Alert>
      )}

      {hasDraftChanges && (
        <Alert>
          <AlertTitle>Editing creates a new draft</AlertTitle>
          <AlertDescription>
            Published version{' '}
            <Text as="span" size="sm" weight="medium">
              v{publishedVersion}
            </Text>{' '}
            stays live and exportable. Your changes are an in-progress draft (v
            {nextDraftVersion}) — submit it for approval to publish.
          </AlertDescription>
        </Alert>
      )}

      {isDeclined && (
        <Alert variant="destructive">
          <AlertTitle>Declined</AlertTitle>
          <AlertDescription>
            This document was declined by{' '}
            <Text as="span" size="sm" weight="medium">
              {approverName}
            </Text>
            {declinedDate ? ` on ${declinedDate}` : ''}.
            {showResubmitButton ? ' You can submit it for approval again.' : ''}
          </AlertDescription>
        </Alert>
      )}

      {canCurrentUserApprove && (
        <ApprovalBanner
          variant="warning"
          title="Action required by you"
          description="This document is awaiting your approval."
          approveText="Approve"
          rejectText="Decline"
          onApprove={onApprove}
          onReject={onDecline}
        />
      )}

      {isPending && !canCurrentUserApprove && (
        <Alert variant="warning" icon={<Time />}>
          <AlertTitle>Pending approval</AlertTitle>
          <AlertDescription>
            This document is awaiting approval from{' '}
            <Text as="span" size="sm" weight="medium">
              {approverName}
            </Text>
            .
          </AlertDescription>
        </Alert>
      )}

      {(showSubmitButton || showResubmitButton) && (
        <div className="flex justify-start">
          <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(true)}>
            {showResubmitButton ? 'Resubmit for approval' : 'Submit for approval'}
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
