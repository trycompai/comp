'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { Accordion, Card, Progress, Text, VStack } from '@trycompai/ui-v2';
import { useState } from 'react';
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
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

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
    <VStack align="stretch" gap="4">
      <Card.Root>
        <Card.Header>
          <Card.Title>Overview</Card.Title>
          <Card.Description>
            Please complete the following tasks to stay compliant and secure.
          </Card.Description>
        </Card.Header>

        <Card.Body>
          <VStack align="stretch" gap="4">
            <VStack align="stretch" gap="2">
              <Text fontSize="sm" color="fg.muted">
                {completedCount} of {totalCount} tasks completed
              </Text>
              <Progress.Root value={progressPercent} colorPalette="primary">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </VStack>

            <Accordion.Root
              multiple={false}
              collapsible
              value={accordionValue}
              onValueChange={({ value }) => setAccordionValue(value)}
            >
              <PoliciesAccordionItem policies={policies} member={member} />
              <DeviceAgentAccordionItem member={member} host={host} fleetPolicies={fleetPolicies} />
              <GeneralTrainingAccordionItem trainingVideoCompletions={trainingVideoCompletions} />
            </Accordion.Root>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
};
