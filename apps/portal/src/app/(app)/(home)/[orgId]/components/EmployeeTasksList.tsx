'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import type { Device, EmployeeTrainingVideoCompletion, Member, Policy, PolicyVersion } from '@db';
import { Accordion, Button } from '@trycompai/design-system';
import Link from 'next/link';
import useSWR from 'swr';
import type { FleetPolicy, Host } from '../types';
import { HIPAA_TRAINING_ID } from '@/lib/data/hipaa-training-content';
import { DeviceAgentAccordionItem } from './tasks/DeviceAgentAccordionItem';
import { GeneralTrainingAccordionItem } from './tasks/GeneralTrainingAccordionItem';
import { HipaaTrainingAccordionItem } from './tasks/HipaaTrainingAccordionItem';
import { PoliciesAccordionItem } from './tasks/PoliciesAccordionItem';

interface PortalForm {
  type: string;
  title: string;
  description: string;
}

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
  agentDevices: Device[];
  deviceAgentStepEnabled: boolean;
  securityTrainingStepEnabled: boolean;
  hasHipaaFramework: boolean;
  whistleblowerReportEnabled: boolean;
  accessRequestFormEnabled: boolean;
  portalForms: PortalForm[];
}

export const EmployeeTasksList = ({
  organizationId,
  policies,
  trainingVideos: trainingVideoCompletions,
  member,
  fleetPolicies,
  host,
  agentDevices,
  deviceAgentStepEnabled,
  securityTrainingStepEnabled,
  hasHipaaFramework,
  whistleblowerReportEnabled,
  accessRequestFormEnabled,
  portalForms,
}: EmployeeTasksListProps) => {
  const { completions: trainingCompletions } = useTrainingCompletions({
    fallbackData: trainingVideoCompletions,
  });

  const {
    data: response,
    isValidating,
    mutate: fetchFleetPolicies,
  } = useSWR<{ device: Host | null; fleetPolicies: FleetPolicy[] }>(
    `/api/fleet-policies?organizationId=${organizationId}`,
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: { device: host, fleetPolicies },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: false,
    },
  );

  // Poll agent device status so compliance updates appear without full reload
  const { data: agentDeviceResponse } = useSWR<{ devices: Device[] }>(
    deviceAgentStepEnabled
      ? `/api/device-agent/status?organizationId=${organizationId}`
      : null,
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: { devices: agentDevices },
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      revalidateOnMount: true,
    },
  );

  if (!response) {
    return null;
  }

  const sortedAgentDevices = [...(agentDeviceResponse?.devices ?? [])].sort(
    (a, b) => {
      if (!a.lastCheckIn && !b.lastCheckIn) return 0;
      if (!a.lastCheckIn) return 1;
      if (!b.lastCheckIn) return -1;
      return new Date(b.lastCheckIn).getTime() - new Date(a.lastCheckIn).getTime();
    },
  );

  // Check completion status
  const hasAcceptedPolicies =
    policies.length === 0 || policies.every((p) => p.signedBy.includes(member.id));

  // Device agent takes priority over Fleet for completion
  const hasAnyAgentDevice = sortedAgentDevices.length > 0;
  const hasFleetDevice = response.device !== null;
  const hasCompletedDeviceSetup = hasAnyAgentDevice
    ? sortedAgentDevices.some((d) => d.isCompliant)
    : hasFleetDevice &&
      (response.fleetPolicies.length === 0 ||
        response.fleetPolicies.every((policy) => policy.response === 'pass'));

  // Calculate general training completion (matching logic from GeneralTrainingAccordionItem)
  const generalTrainingVideoIds = trainingVideos
    .filter((video) => video.id.startsWith('sat-'))
    .map((video) => video.id);

  const completedGeneralTrainingCount = trainingCompletions.filter(
    (completion) =>
      generalTrainingVideoIds.includes(completion.videoId) &&
      completion.completedAt !== null,
  ).length;

  const hasCompletedGeneralTraining =
    completedGeneralTrainingCount === generalTrainingVideoIds.length;

  const hasCompletedHipaaTraining = trainingCompletions.some(
    (c) => c.videoId === HIPAA_TRAINING_ID && c.completedAt !== null,
  );

  const completedCount = [
    hasAcceptedPolicies,
    ...(deviceAgentStepEnabled ? [hasCompletedDeviceSetup] : []),
    ...(securityTrainingStepEnabled ? [hasCompletedGeneralTraining] : []),
    ...(hasHipaaFramework ? [hasCompletedHipaaTraining] : []),
  ].filter(Boolean).length;

  const accordionItems = [
    {
      title: 'Security Policies',
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
                agentDevices={sortedAgentDevices}
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
              <GeneralTrainingAccordionItem />
            ),
          },
        ]
      : []),
    ...(hasHipaaFramework
      ? [
          {
            title: 'Complete HIPAA security awareness training',
            content: <HipaaTrainingAccordionItem />,
          },
        ]
      : []),
  ];
  const visiblePortalForms = portalForms.filter((form) => {
    if (form.type === 'whistleblower-report') return whistleblowerReportEnabled;
    if (form.type === 'access-request') return accessRequestFormEnabled;
    return true;
  });

  return (
    <div className="space-y-4">
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

      <div className="space-y-3">
        <Accordion>
          {accordionItems.map((item, idx) => (
            <div key={item.title ?? idx}>{item.content}</div>
          ))}
        </Accordion>
      </div>

      {/* Company forms */}
      {visiblePortalForms.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Company Forms
          </div>
          {visiblePortalForms.map((form) => (
            <div
              key={form.type}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <span className="text-sm font-medium">{form.title}</span>
                <p className="text-xs text-muted-foreground">{form.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {form.type === 'access-request' && (
                  <Link href={`/${organizationId}/documents/${form.type}/submissions`}>
                    <Button variant="ghost">My requests</Button>
                  </Link>
                )}
                <Link href={`/${organizationId}/documents/${form.type}`}>
                  <Button>Submit</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
