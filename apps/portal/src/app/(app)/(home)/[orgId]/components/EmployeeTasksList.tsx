'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { Accordion } from '@comp/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { EmployeeTrainingVideoCompletion, Member, Policy, PolicyVersion } from '@db';
import { CheckCircle2 } from 'lucide-react';
import useSWR from 'swr';
import type { FleetPolicy, Host } from '../types';
import { DeviceAgentAccordionItem } from './tasks/DeviceAgentAccordionItem';
import { GeneralTrainingAccordionItem } from './tasks/GeneralTrainingAccordionItem';
import { PoliciesAccordionItem } from './tasks/PoliciesAccordionItem';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface EmployeeTasksListProps {
  organizationId: string;
  policies: PolicyWithVersion[];
  trainingVideos: EmployeeTrainingVideoCompletion[];
  member: Member;
  fleetPolicies: FleetPolicy[];
  host: Host | null;
  deviceAgentStepEnabled: boolean;
  securityTrainingStepEnabled: boolean;
}

export const EmployeeTasksList = ({
  organizationId,
  policies,
  trainingVideos: trainingVideoCompletions,
  member,
  fleetPolicies,
  host,
  deviceAgentStepEnabled,
  securityTrainingStepEnabled,
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
      revalidateOnMount: false
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
    ...(deviceAgentStepEnabled ? [hasCompletedDeviceSetup] : []),
    ...(securityTrainingStepEnabled ? [hasCompletedGeneralTraining] : []),
  ].filter(Boolean).length;

  const accordionItems = [
    {
      title: 'Accept security policies',
      content: <PoliciesAccordionItem policies={policies} member={member} />,
    },
    ...(deviceAgentStepEnabled
      ? [
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
        ]
      : []),
    ...(securityTrainingStepEnabled
      ? [
          {
            title: 'Complete general security awareness training',
            content: (
              <GeneralTrainingAccordionItem
                trainingVideoCompletions={trainingVideoCompletions}
              />
            ),
          },
        ]
      : []),
  ];

  const allCompleted = completedCount === accordionItems.length;

  if (allCompleted) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              You've completed all required tasks. No further action is needed at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
