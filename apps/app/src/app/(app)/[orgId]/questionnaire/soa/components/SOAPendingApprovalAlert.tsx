'use client';

import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@trycompai/design-system';
import { Checkmark, CloseOutline, WarningAlt } from '@trycompai/design-system/icons';
import type { Member, User } from '@db';

interface SOAPendingApprovalAlertProps {
  approver?: (Member & { user: User }) | null;
  currentMemberId?: string | null;
  approverId?: string | null;
  canCurrentUserApprove: boolean;
  isApproving: boolean;
  isDeclining: boolean;
  onApprove: () => void;
  onDecline: () => void;
  lastDeclinedAt?: Date | null;
  lastDeclinedBy?: (Member & { user: User }) | null;
}

export function SOAPendingApprovalAlert({
  approver,
  currentMemberId,
  approverId,
  canCurrentUserApprove,
  isApproving,
  isDeclining,
  onApprove,
  onDecline,
  lastDeclinedAt,
  lastDeclinedBy,
}: SOAPendingApprovalAlertProps) {
  return (
    <Alert variant="default">
      <WarningAlt className="h-4 w-4" />
      <AlertTitle>
        {canCurrentUserApprove ? 'Action Required by You' : 'Pending Approval'}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {lastDeclinedAt && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="font-semibold flex items-center gap-2">
              <CloseOutline className="h-4 w-4" />
              Document was declined on{' '}
              {new Date(lastDeclinedAt).toLocaleDateString()}
              {lastDeclinedBy
                ? ` by ${lastDeclinedBy.user.name || lastDeclinedBy.user.email || 'an approver'}`
                : ''}
            </div>
            <p className="mt-1 text-xs text-destructive/80">
              Review the comments and make necessary changes before resubmitting for approval.
            </p>
          </div>
        )}
        <div>
          This document is awaiting approval from{' '}
          <span className="font-semibold">
            {approverId === currentMemberId
              ? 'you'
              : approver
                ? `${approver.user.name} (${approver.user.email})`
                : 'an approver'}
          </span>
          .
        </div>
        {canCurrentUserApprove &&
          ' Please review the details and approve or decline the document.'}
        {canCurrentUserApprove && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              onClick={onApprove}
              disabled={isApproving || isDeclining}
              loading={isApproving}
              size="sm"
              iconLeft={<Checkmark />}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={onDecline}
              disabled={isApproving || isDeclining}
              loading={isDeclining}
              variant="destructive"
              size="sm"
              iconLeft={<CloseOutline />}
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
