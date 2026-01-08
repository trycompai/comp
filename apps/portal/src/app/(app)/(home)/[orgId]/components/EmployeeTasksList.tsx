'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { Accordion, Card, CardContent, CardHeader } from '@trycompai/design-system';
import type { EmployeePortalDashboard } from '../types/employee-portal';
import { DeviceAgentAccordionItem } from './tasks/DeviceAgentAccordionItem';
import { GeneralTrainingAccordionItem } from './tasks/GeneralTrainingAccordionItem';
import { PoliciesAccordionItem } from './tasks/PoliciesAccordionItem';

interface EmployeeTasksListProps {
  policies: EmployeePortalDashboard['policies'];
  trainingVideos: EmployeePortalDashboard['trainingVideos'];
  member: EmployeePortalDashboard['member'];
  fleetPolicies: EmployeePortalDashboard['fleetPolicies'];
  host: EmployeePortalDashboard['host'];
}

export const EmployeeTasksList = ({
  policies,
  trainingVideos: trainingVideoCompletions,
  member,
  fleetPolicies,
  host,
}: EmployeeTasksListProps) => {
  // Check completion status
  const hasAcceptedPolicies =
    policies.length === 0 || policies.every((p) => p.signedBy.includes(member.id));
  const hasInstalledAgent = host !== null;
  const allFleetPoliciesPass =
    fleetPolicies.length === 0 || fleetPolicies.every((policy) => policy.response === 'pass');
  const hasCompletedDeviceSetup = hasInstalledAgent && allFleetPoliciesPass;

  // Calculate general training completion (matching logic from GeneralTrainingAccordionItem)
  const generalTrainingVideoIds = trainingVideos
    .filter((video) => video.id.startsWith('sat-'))
    .map((video) => video.id);

  const completedGeneralTrainingCount = trainingVideoCompletions.filter(
    (completion) =>
      generalTrainingVideoIds.includes(completion.videoId) && completion.completedAt !== null,
  ).length;

  const hasCompletedGeneralTraining =
    completedGeneralTrainingCount === generalTrainingVideoIds.length;

  const completedCount = [
    hasAcceptedPolicies,
    hasCompletedDeviceSetup,
    hasCompletedGeneralTraining,
  ].filter(Boolean).length;

  const totalCount = 3;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Please complete the following tasks to stay compliant and secure.
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} tasks completed
              </p>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-border">
              <Accordion multiple>
                <PoliciesAccordionItem policies={policies} member={member} />
                <DeviceAgentAccordionItem
                  member={member}
                  host={host}
                  fleetPolicies={fleetPolicies}
                />
                <GeneralTrainingAccordionItem trainingVideoCompletions={trainingVideoCompletions} />
              </Accordion>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
