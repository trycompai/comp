'use client';

import { acceptRequestedPolicyChangesAction } from '@/actions/policies/accept-requested-policy-changes';
import { denyRequestedPolicyChangesAction } from '@/actions/policies/deny-requested-policy-changes';
import { authClient } from '@/utils/auth-client';
import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Icons } from '@comp/ui/icons';
import type { Member, Policy, User } from '@db';
import { Control } from '@db';
import { format } from 'date-fns';
import { Branch, T, useGT, Var } from 'gt-next';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreVertical,
  PencilIcon,
  ShieldCheck,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
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
  const t = useGT();
  const { data: activeMember } = authClient.useActiveMember();
  const [, setOpen] = useQueryState('policy-overview-sheet');
  const [, setArchiveOpen] = useQueryState('archive-policy-sheet');
  const canCurrentUserApprove = policy?.approverId === activeMember?.id;

  const denyPolicyChanges = useAction(denyRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.info(t('Policy changes denied!'));
      // Force a complete page reload instead of just a refresh
      window.location.reload();
    },
    onError: () => {
      toast.error(t('Failed to deny policy changes.'));
    },
  });

  const acceptPolicyChanges = useAction(acceptRequestedPolicyChangesAction, {
    onSuccess: () => {
      toast.success(t('Policy changes accepted and published!'));
      // Force a complete page reload instead of just a refresh
      window.location.reload();
    },
    onError: () => {
      toast.error(t('Failed to accept policy changes.'));
    },
  });

  // Dialog state for approval/denial actions
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Dropdown menu state
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          <T>
            <AlertTitle>
              <Branch
                branch={canCurrentUserApprove.toString()}
                true={<>Action Required by You</>}
                false={<>Pending Approval</>}
              />
            </AlertTitle>
          </T>
          <AlertDescription className="flex flex-col gap-2">
            <T>
              <div>
                This policy is awaiting approval from{' '}
                <span className="font-semibold">
                  <Branch
                    branch={(policy.approverId === activeMember?.id).toString()}
                    true={<>you</>}
                    false={
                      <>
                        <Var>{policy?.approver?.user?.name}</Var> (
                        <Var>{policy?.approver?.user?.email}</Var>)
                      </>
                    }
                  />
                </span>
                .
              </div>
            </T>
            <T>
              <Branch
                branch={canCurrentUserApprove.toString()}
                true={<> Please review the details and either approve or reject the changes.</>}
                false={<> All fields are disabled until the policy is actioned.</>}
              />
            </T>
            {isPendingApproval && policy.approverId && canCurrentUserApprove && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setDenyDialogOpen(true)}>
                  <ShieldX className="h-4 w-4" />
                  {t('Reject Changes')}
                </Button>
                <Button onClick={() => setApproveDialogOpen(true)}>
                  <ShieldCheck className="h-4 w-4" />
                  {t('Approve')}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      {policy?.isArchived && (
        <Alert>
          <div className="flex items-center gap-2">
            <ArchiveIcon className="h-4 w-4" />
            <T>
              <div className="font-medium">This policy is archived</div>
            </T>
          </div>
          <T>
            <AlertDescription>
              <Branch
                branch={policy?.isArchived?.toString() ?? 'false'}
                true={
                  <>
                    Archived on{' '}
                    <Var>{format(new Date(policy?.updatedAt ?? new Date()), 'PPP')}</Var>
                  </>
                }
                false={<></>}
              />
            </AlertDescription>
          </T>
          <Button size="sm" variant="outline" onClick={() => setArchiveOpen('true')}>
            <ArchiveRestoreIcon className="h-3 w-3" />
            {t('Restore')}
          </Button>
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
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPendingApproval}
                    className="m-0 size-auto p-2 hover:bg-transparent"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      setOpen('true');
                    }}
                    disabled={isPendingApproval}
                  >
                    <PencilIcon className="mr-2 h-4 w-4" />
                    {t('Edit policy')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      setArchiveOpen('true');
                    }}
                    disabled={isPendingApproval}
                  >
                    {policy?.isArchived ? (
                      <ArchiveRestoreIcon className="mr-2 h-4 w-4" />
                    ) : (
                      <ArchiveIcon className="mr-2 h-4 w-4" />
                    )}
                    {policy?.isArchived ? t('Restore policy') : t('Archive policy')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={isPendingApproval}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            title={t('Approve Policy Changes')}
            description={t(
              'Are you sure you want to approve these policy changes? You can optionally add a comment that will be visible in the policy history.',
            )}
            confirmText={t('Approve')}
            confirmIcon={<ShieldCheck className="h-4 w-4" />}
          />

          {/* Denial Dialog */}
          <PolicyActionDialog
            isOpen={denyDialogOpen}
            onClose={() => setDenyDialogOpen(false)}
            onConfirm={handleDeny}
            title={t('Deny Policy Changes')}
            description={t(
              'Are you sure you want to deny these policy changes? You can optionally add a comment explaining your decision that will be visible in the policy history.',
            )}
            confirmText={t('Deny')}
            confirmIcon={<ShieldX className="h-4 w-4" />}
            confirmVariant="destructive"
          />

          {/* Delete Dialog */}
          <PolicyDeleteDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            policy={policy}
          />
        </>
      )}
    </div>
  );
}
