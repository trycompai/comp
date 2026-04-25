'use client';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  HStack,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useTaskPolicies,
  type TaskPolicyGroup,
} from '../hooks/use-task-policies';

const COLLAPSE_THRESHOLD = 5;

export function TaskPolicies() {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const { groups, isLoading, error } = useTaskPolicies({
    taskId,
    organizationId: orgId,
  });

  // Defensive filter: never render non-published policies even if the API
  // regresses and returns them.
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      policies: group.policies.filter((p) => p.status === 'published'),
    }))
    // Drop empty groups: a control with no published policies is irrelevant noise
    // on the task page. Diverges intentionally from PolicyEvidenceTasks, which
    // keeps empty groups as a prompt to add tasks.
    .filter((group) => group.policies.length > 0);

  // Dedupe by policy ID — a single policy can appear under multiple controls
  // attached to the same task, but for the count we want unique policies.
  const visiblePolicyIds = new Set<string>();
  for (const group of visibleGroups) {
    for (const policy of group.policies) visiblePolicyIds.add(policy.id);
  }
  const visibleCount = visiblePolicyIds.size;

  if (error) {
    return (
      <Section
        title="Policies"
        description="Policies whose controls this task demonstrates."
      >
        <Text>Could not load policies. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section
        title="Policies"
        description="Policies whose controls this task demonstrates."
      >
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (visibleGroups.length === 0) {
    return (
      <Section
        title="Policies"
        description="Policies whose controls this task demonstrates."
      >
        <Text>No policies reference this task through its mapped controls.</Text>
      </Section>
    );
  }

  return (
    <Section
      title="Policies"
      description={`${visibleCount} ${visibleCount === 1 ? 'policy' : 'policies'} whose controls this task demonstrates.`}
    >
      <Stack gap="4">
        {visibleGroups.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
    </Section>
  );
}

function ControlGroup({
  group,
  orgId,
}: {
  group: TaskPolicyGroup;
  orgId: string;
}) {
  const { control, policies } = group;
  const label =
    policies.length === 1 ? 'Show 1 policy' : `Show ${policies.length} policies`;

  if (policies.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <HStack justify="between" align="center">
          <Text weight="medium">{control.name}</Text>
          <CollapsibleTrigger className="inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            {label}
          </CollapsibleTrigger>
        </HStack>
        <CollapsibleContent>
          <PolicyList policies={policies} orgId={orgId} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Stack gap="2">
      <Text weight="medium">{control.name}</Text>
      <PolicyList policies={policies} orgId={orgId} />
    </Stack>
  );
}

function PolicyList({
  policies,
  orgId,
}: {
  policies: TaskPolicyGroup['policies'];
  orgId: string;
}) {
  return (
    <Stack gap="1">
      {policies.map((policy) => (
        <Link
          key={policy.id}
          href={`/${orgId}/policies/${policy.id}`}
          className="block rounded px-3 py-2 hover:bg-muted"
        >
          <HStack justify="between" align="center">
            <Text>{policy.name}</Text>
            <HStack gap="2">
              <Badge>{policy.status}</Badge>
              {policy.frequency ? <Badge>{policy.frequency}</Badge> : null}
            </HStack>
          </HStack>
        </Link>
      ))}
    </Stack>
  );
}
