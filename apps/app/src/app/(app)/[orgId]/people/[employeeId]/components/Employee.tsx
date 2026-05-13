'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Organization, Policy, User } from '@db';
import {
  PageLayout,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { DeviceWithChecks, FleetPolicy, Host } from '../../devices/types';
import type { BackgroundCheckBillingStatus, BackgroundCheckRecord } from './backgroundCheckTypes';
import { EmployeeBackgroundCheck } from './EmployeeBackgroundCheck';
import { EmployeeDetails } from './EmployeeDetails';
import { EmployeeDevice } from './EmployeeDevice';
import { EmployeePageHeader } from './EmployeePageHeader';
import { EmployeePolicies } from './EmployeePolicies';
import { EmployeeHipaaTraining, EmployeeTrainingVideos } from './EmployeeTraining';
import { OffboardingChecklist } from './OffboardingChecklist';

type EmployeeTab =
  | 'details'
  | 'policies'
  | 'training'
  | 'hipaa'
  | 'device'
  | 'offboarding'
  | 'background-check';

interface EmployeeProps {
  employee: Member & {
    user: User;
  };
  policies: Policy[];
  trainingVideos: (EmployeeTrainingVideoCompletion & {
    metadata: TrainingVideo;
  })[];
  fleetPolicies: FleetPolicy[];
  host: Host;
  canEdit: boolean;
  organization: Organization;
  memberDevice: DeviceWithChecks | null;
  orgId: string;
  hasHipaaFramework: boolean;
  hipaaCompletedAt: Date | null;
  initialBackgroundCheck: BackgroundCheckRecord | null;
  initialBackgroundCheckBillingStatus: BackgroundCheckBillingStatus;
  backgroundCheckStepEnabled: boolean;
  memberBackgroundCheckExempt: boolean;
}

export function Employee({
  employee,
  policies,
  trainingVideos,
  fleetPolicies,
  host,
  canEdit,
  organization,
  memberDevice,
  orgId,
  hasHipaaFramework,
  hipaaCompletedAt,
  initialBackgroundCheck,
  initialBackgroundCheckBillingStatus,
  backgroundCheckStepEnabled,
  memberBackgroundCheckExempt,
}: EmployeeProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const VALID_TABS: EmployeeTab[] = ['details', 'policies', 'training', 'hipaa', 'device', 'offboarding', 'background-check'];

  const resolveTab = (): EmployeeTab => {
    if (
      backgroundCheckStepEnabled &&
      (searchParams.get('background_check_step') || searchParams.get('background_check_billing'))
    ) {
      return 'background-check';
    }
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as EmployeeTab)) {
      return tabParam as EmployeeTab;
    }
    return 'details';
  };

  const activeTab = resolveTab();

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'details') {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }
      params.delete('background_check_step');
      params.delete('background_check_billing');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [memberExempt, setMemberExempt] = useState(memberBackgroundCheckExempt);
  const [lastSyncedExempt, setLastSyncedExempt] = useState(memberBackgroundCheckExempt);

  if (memberBackgroundCheckExempt !== lastSyncedExempt) {
    setLastSyncedExempt(memberBackgroundCheckExempt);
    setMemberExempt(memberBackgroundCheckExempt);
  }

  return (
    <PageLayout
      header={
        <EmployeePageHeader
          employeeName={employee.user.name ?? 'Employee'}
          orgId={orgId}
          backgroundCheck={initialBackgroundCheck}
          backgroundCheckStepEnabled={backgroundCheckStepEnabled}
          memberBackgroundCheckExempt={memberExempt}
        />
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value) handleTabChange(value);
        }}
      >
        <Stack gap="4">
          <TabsList variant="underline">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="training">Training Videos</TabsTrigger>
            {hasHipaaFramework && <TabsTrigger value="hipaa">HIPAA Training</TabsTrigger>}
            <TabsTrigger value="device">Device</TabsTrigger>
            {employee.offboardDate && (
              <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
            )}
            {backgroundCheckStepEnabled && (
              <TabsTrigger value="background-check">Background Check</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="details">
            <EmployeeDetails employee={employee} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="policies">
            <EmployeePolicies employee={employee} policies={policies} />
          </TabsContent>
          <TabsContent value="training">
            <EmployeeTrainingVideos
              employee={employee}
              trainingVideos={trainingVideos}
              organization={organization}
            />
          </TabsContent>
          {hasHipaaFramework && (
            <TabsContent value="hipaa">
              <EmployeeHipaaTraining
                employee={employee}
                organization={organization}
                hipaaCompletedAt={hipaaCompletedAt}
              />
            </TabsContent>
          )}
          <TabsContent value="device">
            <EmployeeDevice
              organization={organization}
              memberDevice={memberDevice}
              host={host}
              fleetPolicies={fleetPolicies}
            />
          </TabsContent>
          {employee.offboardDate && (
            <TabsContent value="offboarding">
              <OffboardingChecklist
                memberId={employee.id}
                canEdit={canEdit}
                offboardDate={employee.offboardDate?.toISOString() ?? ''}
              />
            </TabsContent>
          )}
          {backgroundCheckStepEnabled && (
            <TabsContent value="background-check">
              <EmployeeBackgroundCheck
                employee={employee}
                organizationId={orgId}
                initialBackgroundCheck={initialBackgroundCheck}
                initialBillingStatus={initialBackgroundCheckBillingStatus}
                backgroundCheckStepEnabled={backgroundCheckStepEnabled}
                memberBackgroundCheckExempt={memberExempt}
                onMemberBackgroundCheckExemptChange={setMemberExempt}
              />
            </TabsContent>
          )}
        </Stack>
      </Tabs>
    </PageLayout>
  );
}
