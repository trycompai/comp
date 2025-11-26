'use client';

import { Button } from '@comp/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { ShieldX, ShieldCheck, Loader2, XCircle } from 'lucide-react';
import { Member, User } from '@db';

interface SOAPendingApprovalAlertProps {
  approver?: (Member & { user: User }) | null;
  currentMemberId?: string | null;
  approverId?: string | null;
  canCurrentUserApprove: boolean;
  isApproving: boolean;
  isDeclining: boolean;
  onApprove: () => void;
  onDecline: () => void;
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
}: SOAPendingApprovalAlertProps) {
  return (
    <Alert variant="default">
      <ShieldX className="h-4 w-4" />
      <AlertTitle>
        {canCurrentUserApprove ? 'Action Required by You' : 'Pending Approval'}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>
          This SOA document is awaiting approval from{' '}
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
          ' Please review the details and approve the document.'}
        {!canCurrentUserApprove && ' All fields are disabled until the document is approved.'}
        {canCurrentUserApprove && (
          <div className="flex items-center gap-2 mt-2">
            <Button onClick={onApprove} disabled={isApproving || isDeclining}>
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
            <Button 
              onClick={onDecline} 
              disabled={isApproving || isDeclining}
              variant="destructive"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Decline
                </>
              )}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

