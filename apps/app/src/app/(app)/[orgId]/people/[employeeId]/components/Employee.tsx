'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Organization, Policy, User } from '@db';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import type { DeviceWithChecks, FleetPolicy, Host } from '../../devices/types';
import { EmployeeDetails } from './EmployeeDetails';
import { EmployeeTasks } from './EmployeeTasks';

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
}: EmployeeProps) {
  return (
    <PageLayout
      header={
        <PageHeader
          title={employee.user.name ?? 'Employee'}
          breadcrumbs={[
            { label: 'People', href: `/${orgId}/people` },
            { label: employee.user.name ?? 'Employee', isCurrent: true },
          ]}
        />
      }
    >
      <Stack gap="4">
        <EmployeeDetails
          employee={employee}
          canEdit={canEdit}
        />
        <EmployeeTasks
          employee={employee}
          policies={policies}
          trainingVideos={trainingVideos}
          fleetPolicies={fleetPolicies}
          host={host}
          organization={organization}
          memberDevice={memberDevice}
        />
      </Stack>
    </PageLayout>
  );
}
