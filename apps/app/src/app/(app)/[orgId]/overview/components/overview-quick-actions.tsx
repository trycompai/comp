'use client';

import {
  getPolicyAcknowledgmentTotal,
  PolicyAcknowledgmentInvalidationDialog,
} from '@/components/policies/PolicyAcknowledgmentInvalidationDialog';
import type { Policy } from '@db';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface PendingOffboardingMember {
  memberId: string;
  name: string;
  email: string;
  offboardDate: string;
  completedItems: number;
  totalItems: number;
}

export interface PendingOffboardingResponse {
  members: PendingOffboardingMember[];
}

export function formatQuickActionStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getQuickActionProgressWidth({
  totalPolicies,
  totalTasks,
  unpublishedPolicies,
  incompleteTasks,
}: {
  totalPolicies: number;
  totalTasks: number;
  unpublishedPolicies: number;
  incompleteTasks: number;
}) {
  if (totalPolicies + totalTasks === 0) {
    return 0;
  }

  return (
    ((totalPolicies + totalTasks - (unpublishedPolicies + incompleteTasks)) /
      (totalPolicies + totalTasks)) *
    100
  );
}

export function usePublishAllPoliciesAction({
  unpublishedPolicies,
}: {
  unpublishedPolicies: Policy[];
}) {
  const router = useRouter();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bulkAcknowledgmentInvalidations = useMemo(
    () => getPolicyAcknowledgmentTotal(unpublishedPolicies),
    [unpublishedPolicies],
  );

  const handlePublishAllPolicies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/policies/publish-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to publish policies');
      }

      toast.success('All policies published!');
      setIsConfirmDialogOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to publish policies.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishAllClick = () => {
    if (bulkAcknowledgmentInvalidations === 0) {
      void handlePublishAllPolicies();
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const publishAllPoliciesDialog = (
    <PolicyAcknowledgmentInvalidationDialog
      acknowledgmentCount={bulkAcknowledgmentInvalidations}
      actionDescription="Publishing these policies"
      confirmText="Publish and invalidate"
      isLoading={isLoading}
      onConfirm={() => void handlePublishAllPolicies()}
      onOpenChange={setIsConfirmDialogOpen}
      open={isConfirmDialogOpen}
    />
  );

  return {
    handlePublishAllClick,
    publishAllPoliciesDialog,
  };
}
