'use client';

import { acceptRequestedPolicyChangesAction } from '@/actions/policies/accept-requested-policy-changes';
import { denyRequestedPolicyChangesAction } from '@/actions/policies/deny-requested-policy-changes';
import { authClient } from '@/utils/auth-client';
import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import type { Member, Policy, User } from '@db';
import { Archive, CheckmarkFilled, CloseFilled, Renew } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useAction } from 'next-safe-action/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PolicyActionDialog } from './PolicyActionDialog';

interface PolicyAlertsProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  isPendingApproval: boolean;
}

export function PolicyAlerts({ policy, isPendingApproval }: PolicyAlertsProps) {
  const { data: activeMember } = authClient.useActiveMember();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCurrentUserApprove = policy?.approverId === activeMember?.id;

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);

  const denyPolicyChanges = useAction(denyRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.info('Policy changes denied!');
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to deny policy changes.');
    },
  });

  const acceptPolicyChanges = useAction(acceptRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.success('Policy changes accepted and published!');
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to accept policy changes.');
    },
  });

  const handleApprove = (comment?: string) => {
    if (policy?.id && policy.approverId) {
      acceptPolicyChanges.execute({
        id: policy.id,
        approverId: policy.approverId,
        comment,
        entityId: policy.id,
      });
    }
  };

  const handleDeny = (comment?: string) => {
    if (policy?.id && policy.approverId) {
      denyPolicyChanges.execute({
        id: policy.id,
        approverId: policy.approverId,
        comment,
        entityId: policy.id,
      });
    }
  };

  const handleOpenArchiveSheet = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('archive-policy-sheet', 'true');
    router.push(`?${params.toString()}`);
  };

  if (!policy) {
    return null;
  }

  const showPendingAlert = isPendingApproval;
  const showArchivedAlert = policy.isArchived;

  if (!showPendingAlert && !showArchivedAlert) {
    return null;
  }

  return (
    <>
      {showPendingAlert && (
        <Alert variant="default">
          <CloseFilled size={16} />
          <AlertTitle>
            {canCurrentUserApprove ? 'Action Required by You' : 'Pending Approval'}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <div>
              This policy is awaiting approval from{' '}
              <span className="font-semibold">
                {policy.approverId === activeMember?.id
                  ? 'you'
                  : `${policy?.approver?.user?.name} (${policy?.approver?.user?.email})`}
              </span>
              .
            </div>
            {canCurrentUserApprove &&
              ' Please review the details and either approve or reject the changes.'}
            {!canCurrentUserApprove && ' All fields are disabled until the policy is actioned.'}
            {isPendingApproval && policy.approverId && canCurrentUserApprove && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setDenyDialogOpen(true)}>
                  <CloseFilled size={16} />
                  Reject Changes
                </Button>
                <Button onClick={() => setApproveDialogOpen(true)}>
                  <CheckmarkFilled size={16} />
                  Approve
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showArchivedAlert && (
        <Alert className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Archive size={16} />
            <div className="space-y-1">
              <div className="font-medium">This policy is archived</div>
              <AlertDescription>
                Archived on {format(new Date(policy?.updatedAt ?? new Date()), 'PPP')}
              </AlertDescription>
            </div>
          </div>
          <div className="shrink-0">
            <Button size="sm" variant="outline" onClick={handleOpenArchiveSheet} className="gap-1">
              <Renew size={12} /> Restore
            </Button>
          </div>
        </Alert>
      )}

      {/* Approval Dialog */}
      <PolicyActionDialog
        isOpen={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApprove}
        title="Approve Policy Changes"
        description="Are you sure you want to approve these policy changes? You can optionally add a comment that will be visible in the policy history."
        confirmText="Approve"
        confirmIcon={<CheckmarkFilled size={16} />}
      />

      {/* Denial Dialog */}
      <PolicyActionDialog
        isOpen={denyDialogOpen}
        onClose={() => setDenyDialogOpen(false)}
        onConfirm={handleDeny}
        title="Deny Policy Changes"
        description="Are you sure you want to deny these policy changes? You can optionally add a comment explaining your decision that will be visible in the policy history."
        confirmText="Deny"
        confirmIcon={<CloseFilled size={16} />}
        confirmVariant="destructive"
      />
    </>
  );
}
