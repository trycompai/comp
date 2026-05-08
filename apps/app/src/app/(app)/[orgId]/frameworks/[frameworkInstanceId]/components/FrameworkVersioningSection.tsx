'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFrameworkUpdateStatus } from '@/hooks/use-framework-update-status';
import { usePermissions } from '@/hooks/use-permissions';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';
import { UpdateAvailableBanner } from './UpdateAvailableBanner';

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
  const { data } = useFrameworkUpdateStatus(frameworkInstanceId, {
    fallbackData: initialStatus,
  });
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();

  const canUpdate = hasPermission('framework', 'update');

  return (
    <>
      {data && (
        <UpdateAvailableBanner
          status={data}
          canUpdate={canUpdate}
          hasActiveAudit={hasActiveAudit}
          onReview={() =>
            router.push(`/${orgId}/frameworks/${frameworkInstanceId}/review-update`)
          }
        />
      )}
    </>
  );
}
