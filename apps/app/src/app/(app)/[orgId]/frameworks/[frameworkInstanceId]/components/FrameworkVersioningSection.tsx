'use client';

import { useFeatureFlag } from '@trycompai/analytics';
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
  const enabled = useFeatureFlag('is-framework-versioning-enabled');
  // Thread the flag into SWR so the update-status request doesn't fire for
  // orgs that don't have versioning enabled. Without this the request runs
  // every mount and we just throw the response away.
  const { data } = useFrameworkUpdateStatus(frameworkInstanceId, {
    fallbackData: initialStatus,
    enabled,
  });
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();

  if (!enabled) return null;

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
