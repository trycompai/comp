'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { Accordion } from '@comp/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { EmployeeTrainingVideoCompletion, Member, Policy } from '@db';
import useSWR from 'swr';
import type { FleetPolicy, Host } from '../types';
import { DeviceAgentAccordionItem } from './tasks/DeviceAgentAccordionItem';
import { GeneralTrainingAccordionItem } from './tasks/GeneralTrainingAccordionItem';
import { PoliciesAccordionItem } from './tasks/PoliciesAccordionItem';

interface EmployeeTasksListProps {
  organizationId: string;
  policies: Policy[];
  trainingVideos: EmployeeTrainingVideoCompletion[];
  member: Member;
  fleetPolicies: FleetPolicy[];
  host: Host | null;
}

export const EmployeeTasksList = ({
  organizationId,
  policies,
  trainingVideos: trainingVideoCompletions,
  member,
  fleetPolicies,
  host,
}: EmployeeTasksListProps) => {
  const { data: response, isValidating, mutate: fetchFleetPolicies } = useSWR<{ device: Host | null; fleetPolicies: FleetPolicy[] }>(
    `/api/fleet-policies?organizationId=${organizationId}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: { device: host, fleetPolicies },
      refreshInterval: 0,
      revalidateOnFocus: false,
    },
  );

  if (!response) {
    return null;
  }

  // Check completion status
  const hasAcceptedPolicies =
    policies.length === 0 || policies.every((p) => p.signedBy.includes(member.id));
  const hasInstalledAgent = response.device !== null;
  const allFleetPoliciesPass =
    response.fleetPolicies.length === 0 || response.fleetPolicies.every((policy) => policy.response === 'pass');
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

  const accordionItems = [
    {
      title: 'Accept security policies',
      content: <PoliciesAccordionItem policies={policies} member={member} />,
    },
    {
      title: 'Download and install Comp AI Device Agent',
      content: (
        <DeviceAgentAccordionItem
          member={member}
          host={response.device}
          fleetPolicies={response.fleetPolicies}
          isLoading={isValidating}
          fetchFleetPolicies={fetchFleetPolicies}
        />
      ),
    },
    {
      title: 'Complete general security awareness training',
      content: <GeneralTrainingAccordionItem trainingVideoCompletions={trainingVideoCompletions} />,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Please complete the following tasks to stay compliant and secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div>
            <div className="text-muted-foreground text-sm">
              {completedCount} of {accordionItems.length} tasks completed
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${(completedCount / accordionItems.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {accordionItems.map((item, idx) => (
              <div key={item.title ?? idx}>{item.content}</div>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
