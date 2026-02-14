'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { Accordion } from '@comp/ui/accordion';
import type { EmployeeTrainingVideoCompletion, Member, Policy, PolicyVersion } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import useSWR from 'swr';
import type { FleetPolicy, Host } from '../types';
import { DeviceAgentAccordionItem } from './tasks/DeviceAgentAccordionItem';
import { GeneralTrainingAccordionItem } from './tasks/GeneralTrainingAccordionItem';
import { PoliciesAccordionItem } from './tasks/PoliciesAccordionItem';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface DeviceStatus {
  id: string;
  isCompliant: boolean;
}

interface EmployeeTasksListProps {
  organizationId: string;
  policies: PolicyWithVersion[];
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
  fleetPolicies: initialFleetPolicies,
  host: initialHost,
}: EmployeeTasksListProps) => {
  // Fetch device-agent status filtered by current org
  const { data: deviceData } = useSWR<{ devices: DeviceStatus[] }>(
    `/api/device-agent/status?organizationId=${organizationId}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: { devices: [] },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: true,
    },
  );

  // Fetch fleet policies via SWR (only if member has a fleet device)
  const hasFleetDevice = initialHost !== null;
  const {
    data: fleetResponse,
    isValidating: isFleetLoading,
    mutate: fetchFleetPolicies,
  } = useSWR<{ device: Host | null; fleetPolicies: FleetPolicy[] }>(
    hasFleetDevice ? `/api/fleet-policies?organizationId=${organizationId}` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: { device: initialHost, fleetPolicies: initialFleetPolicies },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: false,
    },
  );

  const devices = deviceData?.devices ?? [];
  const fleetPolicies = fleetResponse?.fleetPolicies ?? initialFleetPolicies;
  const host = fleetResponse?.device ?? initialHost;

  // Check completion status
  const hasAcceptedPolicies =
    policies.length === 0 || policies.every((p) => p.signedBy.includes(member.id));

  // Device setup is complete if EITHER device-agent is compliant OR all fleet policies pass
  const hasDeviceAgentDevices = devices.length > 0;
  const allDeviceAgentCompliant = devices.length > 0 && devices.every((d) => d.isCompliant);
  const hasInstalledFleetAgent = host !== null;
  const allFleetPoliciesPass =
    fleetPolicies.length === 0 || fleetPolicies.every((policy) => policy.response === 'pass');

  const hasCompletedDeviceSetup =
    (hasDeviceAgentDevices && allDeviceAgentCompliant) ||
    (hasInstalledFleetAgent && allFleetPoliciesPass);

  // Calculate general training completion
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
          organizationId={organizationId}
          member={member}
          host={host}
          fleetPolicies={fleetPolicies}
          isFleetLoading={isFleetLoading}
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
    <PageLayout padding="lg" header={<PageHeader title="Overview" />}>
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="space-y-2">
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
      </div>
    </PageLayout>
  );
};
