'use client';

import { Breadcrumb, Heading } from '@trycompai/design-system';
import { BackgroundCheckVerifiedTick } from '../../components/BackgroundCheckVerifiedTick';
import { isCompletedBackgroundCheck } from './backgroundCheckTypes';
import type { BackgroundCheckRecord } from './backgroundCheckTypes';

export function EmployeePageHeader({
  employeeName,
  orgId,
  backgroundCheck,
  backgroundCheckStepEnabled,
}: {
  employeeName: string;
  orgId: string;
  backgroundCheck: BackgroundCheckRecord | null;
  backgroundCheckStepEnabled: boolean;
}) {
  const isVerified = backgroundCheck
    ? isCompletedBackgroundCheck(backgroundCheck.status)
    : false;

  return (
    <div data-slot="page-header" className="flex flex-col gap-1">
      <div className="overflow-hidden">
        <Breadcrumb
          separator="chevron"
          items={[
            { label: 'People', href: `/${orgId}/people` },
            { label: employeeName, isCurrent: true },
          ]}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Heading level="1">{employeeName}</Heading>
        {backgroundCheckStepEnabled && isVerified && (
          <BackgroundCheckVerifiedTick size={18} lift />
        )}
      </div>
    </div>
  );
}
