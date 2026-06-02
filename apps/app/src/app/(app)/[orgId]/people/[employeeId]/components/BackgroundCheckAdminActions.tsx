'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { Button, HStack } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import type { BackgroundCheckRecord, BackgroundCheckStatus } from './backgroundCheckTypes';

const RETRYABLE: BackgroundCheckStatus[] = ['failed', 'cancelled'];
const CANCELLABLE: BackgroundCheckStatus[] = ['invited', 'in_progress', 'in_review'];

interface BackgroundCheckAdminActionsProps {
  backgroundCheck: BackgroundCheckRecord;
  memberId: string;
  organizationId: string;
  onChange: (next: BackgroundCheckRecord | null) => void | Promise<void>;
}

export function BackgroundCheckAdminActions({
  backgroundCheck,
  memberId,
  organizationId,
  onChange,
}: BackgroundCheckAdminActionsProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('member', 'update');
  const canDelete = hasPermission('member', 'delete');

  const [pending, setPending] = useState<'retry' | 'cancel' | 'delete' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { status } = backgroundCheck;
  const showRetry = canUpdate && RETRYABLE.includes(status);
  const showCancel = canUpdate && CANCELLABLE.includes(status);
  const showDelete = canDelete;

  if (!showRetry && !showCancel && !showDelete) return null;

  const handleRetry = async () => {
    setConfirmingDelete(false);
    setPending('retry');
    const response = await apiClient.post<BackgroundCheckRecord>(
      `/v1/people/${memberId}/background-check/retry`,
      undefined,
      organizationId,
    );
    setPending(null);
    if (response.error || !response.data) {
      toast.error('Failed to retry background check');
      return;
    }
    toast.success('Background check resubmitted');
    await onChange(response.data);
  };

  const handleCancel = async () => {
    setConfirmingDelete(false);
    setPending('cancel');
    const response = await apiClient.post<BackgroundCheckRecord>(
      `/v1/people/${memberId}/background-check/cancel`,
      undefined,
      organizationId,
    );
    setPending(null);
    if (response.error || !response.data) {
      toast.error('Failed to cancel background check');
      return;
    }
    toast.success('Background check cancelled');
    await onChange(response.data);
  };

  const handleDelete = async () => {
    setPending('delete');
    const response = await apiClient.delete<{ ok: true }>(
      `/v1/people/${memberId}/background-check`,
      organizationId,
    );
    setPending(null);
    setConfirmingDelete(false);
    if (response.error) {
      toast.error('Failed to delete background check');
      return;
    }
    toast.success('Background check deleted');
    await onChange(null);
  };

  return (
    <div className="border-t pt-4">
      <HStack gap="2">
        {showRetry && (
          <Button type="button" variant="outline" disabled={pending !== null} onClick={handleRetry}>
            Retry
          </Button>
        )}
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={handleCancel}
          >
            Cancel check
          </Button>
        )}
        {showDelete && !confirmingDelete && (
          <Button
            type="button"
            variant="destructive"
            disabled={pending !== null}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
        {showDelete && confirmingDelete && (
          <>
            <Button
              type="button"
              variant="destructive"
              disabled={pending !== null}
              onClick={handleDelete}
            >
              Confirm delete
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => setConfirmingDelete(false)}
            >
              Keep
            </Button>
          </>
        )}
      </HStack>
    </div>
  );
}
