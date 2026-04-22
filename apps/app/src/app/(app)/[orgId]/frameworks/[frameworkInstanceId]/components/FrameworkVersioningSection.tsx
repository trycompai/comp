'use client';

import { useState } from 'react';
import { useFeatureFlag } from '@trycompai/analytics';
import { useFrameworkUpdateStatus } from '@/hooks/use-framework-update-status';
import { usePermissions } from '@/hooks/use-permissions';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';
import { UpdateAvailableBanner } from './UpdateAvailableBanner';
import { UpdateReviewSheet } from './UpdateReviewSheet';
import { SyncHistorySection } from './SyncHistorySection';

interface FrameworkVersioningSectionProps {
  frameworkInstanceId: string;
  initialStatus?: FrameworkUpdateStatus;
  hasActiveAudit: boolean;
}

export function FrameworkVersioningSection({
  frameworkInstanceId,
  initialStatus,
  hasActiveAudit,
}: FrameworkVersioningSectionProps) {
  const enabled = useFeatureFlag('is-framework-versioning-enabled');
  const { data } = useFrameworkUpdateStatus(frameworkInstanceId, {
    fallbackData: initialStatus,
  });
  const { permissions, hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const canUpdate = hasPermission('framework', 'update');

  return (
    <div className="flex flex-col gap-4">
      {data && (
        <UpdateAvailableBanner
          status={data}
          canUpdate={canUpdate}
          hasActiveAudit={hasActiveAudit}
          onReview={() => setOpen(true)}
        />
      )}
      <UpdateReviewSheet
        open={open}
        onOpenChange={setOpen}
        frameworkInstanceId={frameworkInstanceId}
      />
      <SyncHistorySection
        frameworkInstanceId={frameworkInstanceId}
        permissions={permissions}
      />
    </div>
  );
}
