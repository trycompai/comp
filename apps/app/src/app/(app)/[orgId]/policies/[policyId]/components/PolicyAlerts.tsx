'use client';

import { authClient } from '@/utils/auth-client';
import type { Member, Policy, User } from '@db';
import {
  ApprovalBanner,
  Button,
  HStack,
  Label,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Archive, Renew, Time } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePolicy } from '../hooks/usePolicy';

interface PolicyAlertsProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function PolicyAlerts({ policy, isPendingApproval, onMutate }: PolicyAlertsProps) {
  const { data: activeMember } = authClient.useActiveMember();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const canCurrentUserApprove = policy?.approverId === activeMember?.id;
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  const { acceptChanges, denyChanges } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const approveCommentRef = useRef<HTMLTextAreaElement>(null);
  const rejectCommentRef = useRef<HTMLTextAreaElement>(null);

  const handleApprove = async () => {
    if (policy?.id && policy.approverId) {
      const comment = approveCommentRef.current?.value?.trim() || undefined;
      setIsApproving(true);
      try {
        await acceptChanges({
          approverId: policy.approverId,
          comment,
        });
        toast.success('Policy changes accepted and published!');
        onMutate?.();
      } catch {
        toast.error('Failed to accept policy changes.');
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleDeny = async () => {
    if (policy?.id && policy.approverId) {
      const comment = rejectCommentRef.current?.value?.trim() || undefined;
      setIsDenying(true);
      try {
        await denyChanges({
          approverId: policy.approverId,
          comment,
        });
        toast.info('Policy changes denied!');
        onMutate?.();
      } catch {
        toast.error('Failed to deny policy changes.');
      } finally {
        setIsDenying(false);
      }
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

  const approverName = `${policy?.approver?.user?.name} (${policy?.approver?.user?.email})`;

  return (
    <Stack gap="md">
      {showPendingAlert && canCurrentUserApprove && (
        <ApprovalBanner
          variant="warning"
          title="Your approval is required"
          description="Review this policy and approve or reject the pending changes."
          onApprove={handleApprove}
          onReject={handleDeny}
          approveLoading={isApproving}
          rejectLoading={isDenying}
          approveConfirmation={{
            title: 'Approve Policy Changes',
            description: 'Are you sure you want to approve these policy changes?',
            content: (
              <Stack gap="2">
                <Label htmlFor="approve-comment">Reason (optional)</Label>
                <Textarea
                  ref={approveCommentRef}
                  id="approve-comment"
                  size="full"
                  placeholder="Add an optional comment explaining your decision..."
                />
              </Stack>
            ),
            confirmText: 'Approve',
            cancelText: 'Cancel',
          }}
          rejectConfirmation={{
            title: 'Deny Policy Changes',
            description: 'Are you sure you want to deny these policy changes?',
            content: (
              <Stack gap="2">
                <Label htmlFor="reject-comment">Reason (optional)</Label>
                <Textarea
                  ref={rejectCommentRef}
                  id="reject-comment"
                  size="full"
                  placeholder="Add an optional comment explaining your decision..."
                />
              </Stack>
            ),
            confirmText: 'Deny',
            cancelText: 'Cancel',
          }}
        />
      )}

      {showPendingAlert && !canCurrentUserApprove && (
        <div className="rounded-lg border border-l-4 border-border border-l-muted-foreground/50 bg-background p-4">
          <HStack gap="3" align="start">
            <Text as="span" variant="muted">
              <Time size={20} />
            </Text>
            <Stack gap="1">
              <Text size="sm" weight="medium" leading="tight">
                Pending approval
              </Text>
              <Text size="sm" variant="muted">
                Waiting for {approverName} to review and approve this policy.
              </Text>
            </Stack>
          </HStack>
        </div>
      )}

      {showArchivedAlert && (
        <div className="rounded-lg border border-l-4 border-border border-l-muted-foreground/50 bg-background p-4">
          <HStack gap="3" align="center" justify="between">
            <HStack gap="3" align="start">
              <Text as="span" variant="muted">
                <Archive size={20} />
              </Text>
              <Stack gap="1">
                <Text size="sm" weight="medium" leading="tight">
                  This policy is archived
                </Text>
                <Text size="sm" variant="muted">
                  Archived on {format(new Date(policy?.updatedAt ?? new Date()), 'PPP')}
                </Text>
              </Stack>
            </HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenArchiveSheet}
              iconLeft={<Renew size={12} />}
            >
              Restore
            </Button>
          </HStack>
        </div>
      )}
    </Stack>
  );
}
