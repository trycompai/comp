'use client';

import { useState } from 'react';
import { useFeatureFlag } from '@trycompai/analytics';
import { useFrameworkUpdateStatus } from '@/hooks/use-framework-update-status';
import { usePermissions } from '@/hooks/use-permissions';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';
import { UpdateAvailableBanner } from './UpdateAvailableBanner';
import { UpdateReviewSheet } from './UpdateReviewSheet';

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
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const canUpdate = hasPermission('framework', 'update');

  return (
    <>
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
    </>
  );
}
