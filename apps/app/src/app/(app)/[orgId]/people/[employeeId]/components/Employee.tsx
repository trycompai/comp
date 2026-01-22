'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Policy, User } from '@db';
import { Stack } from '@trycompai/design-system';
import type { FleetPolicy, Host } from '../../devices/types';
import { EmployeeDetails } from './EmployeeDetails';
import { EmployeeTasks } from './EmployeeTasks';

interface EmployeeDetailsProps {
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
}

export function Employee({
  employee,
  policies,
  trainingVideos,
  fleetPolicies,
  host,
  canEdit,
}: EmployeeDetailsProps) {
  return (
    <Stack gap="4">
      <EmployeeDetails employee={employee} canEdit={canEdit} />
      <EmployeeTasks
        employee={employee}
        policies={policies}
        trainingVideos={trainingVideos}
        fleetPolicies={fleetPolicies}
        host={host}
      />
    </Stack>
  );
}
