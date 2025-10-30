'use client';

import { acceptRequestedPolicyChangesAction } from '@/actions/policies/accept-requested-policy-changes';
import { denyRequestedPolicyChangesAction } from '@/actions/policies/deny-requested-policy-changes';
import { authClient } from '@/utils/auth-client';
import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Icons } from '@comp/ui/icons';
import type { Member, Policy, User } from '@db';
import { Control } from '@db';
import { format } from 'date-fns';
import { ArchiveIcon, ArchiveRestoreIcon, ShieldCheck, ShieldX } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
import { regeneratePolicyAction } from '../actions/regenerate-policy';
import { PolicyActionDialog } from './PolicyActionDialog';
import { PolicyArchiveSheet } from './PolicyArchiveSheet';
import { PolicyControlMappings } from './PolicyControlMappings';
import { PolicyDeleteDialog } from './PolicyDeleteDialog';
import { PolicyOverviewSheet } from './PolicyOverviewSheet';
import { UpdatePolicyOverview } from './UpdatePolicyOverview';

export function PolicyOverview({
  policy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval,
}: {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
}) {
  const { data: activeMember } = authClient.useActiveMember();
  const [, setArchiveOpen] = useQueryState('archive-policy-sheet');
  const canCurrentUserApprove = policy?.approverId === activeMember?.id;

  const denyPolicyChanges = useAction(denyRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.info('Policy changes denied!');
      // Force a complete page reload instead of just a refresh
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to deny policy changes.');
    },
  });

  const acceptPolicyChanges = useAction(acceptRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.success('Policy changes accepted and published!');
      // Force a complete page reload instead of just a refresh
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to accept policy changes.');
    },
  });

  // Dialog state for approval/denial actions
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [deleteOpenParam, setDeleteOpenParam] = useQueryState('delete-policy');
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  // Handle approve with optional comment
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

  // Handle deny with optional comment
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

  if (!policy) {
    return null;
  }

  return (
    <div className="space-y-4">
      {isPendingApproval && (
        <Alert variant="default">
          <ShieldX className="h-4 w-4" />
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
                  <ShieldX className="h-4 w-4" />
                  Reject Changes
                </Button>
                <Button onClick={() => setApproveDialogOpen(true)}>
                  <ShieldCheck className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      {policy?.isArchived && (
        <Alert className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <ArchiveIcon className="mt-0.5 h-4 w-4" />
            <div className="space-y-1">
              <div className="font-medium">This policy is archived</div>
              <AlertDescription>
                Archived on {format(new Date(policy?.updatedAt ?? new Date()), 'PPP')}
              </AlertDescription>
            </div>
          </div>
          <div className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setArchiveOpen('true')}
              className="gap-1"
            >
              <ArchiveRestoreIcon className="h-3 w-3" /> Restore
            </Button>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <Icons.Policies className="h-4 w-4" />
                {policy?.name}
              </div>
              {/* Redundant gear removed; actions moved to breadcrumb header */}
              <div className="h-6" />
            </div>
          </CardTitle>
          <CardDescription>{policy?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {policy && (
            <UpdatePolicyOverview
              isPendingApproval={isPendingApproval}
              policy={policy}
              assignees={assignees}
            />
          )}
        </CardContent>
      </Card>

      <PolicyControlMappings
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
      />

      {policy && (
        <>
          <PolicyOverviewSheet policy={policy} />
          <PolicyArchiveSheet policy={policy} />

          {/* Approval Dialog */}
          <PolicyActionDialog
            isOpen={approveDialogOpen}
            onClose={() => setApproveDialogOpen(false)}
            onConfirm={handleApprove}
            title="Approve Policy Changes"
            description="Are you sure you want to approve these policy changes? You can optionally add a comment that will be visible in the policy history."
            confirmText="Approve"
            confirmIcon={<ShieldCheck className="h-4 w-4" />}
          />

          {/* Denial Dialog */}
          <PolicyActionDialog
            isOpen={denyDialogOpen}
            onClose={() => setDenyDialogOpen(false)}
            onConfirm={handleDeny}
            title="Deny Policy Changes"
            description="Are you sure you want to deny these policy changes? You can optionally add a comment explaining your decision that will be visible in the policy history."
            confirmText="Deny"
            confirmIcon={<ShieldX className="h-4 w-4" />}
            confirmVariant="destructive"
          />

          {/* Delete Dialog */}
          <PolicyDeleteDialog
            isOpen={Boolean(deleteOpenParam)}
            onClose={() => setDeleteOpenParam(null)}
            policy={policy}
          />
          {/* Regenerate Dialog */}
          <PolicyActionDialog
            isOpen={regenerateOpen}
            onClose={() => setRegenerateOpen(false)}
            onConfirm={async () => {
              if (!policy?.id) return;
              await regeneratePolicyAction({ policyId: policy.id });
              toast.info('Regeneration started');
            }}
            title="Regenerate Policy"
            description="This will regenerate the policy content. Continue?"
            confirmText="Regenerate"
            confirmIcon={<Icons.AI className="h-4 w-4" />}
          />
        </>
      )}
    </div>
  );
}
