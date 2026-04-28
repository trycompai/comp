'use client';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Heading,
  HStack,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronRight, Document } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useTaskPolicies,
  type TaskPolicyGroup,
} from '../hooks/use-task-policies';

const COLLAPSE_THRESHOLD = 5;
const SECTION_DESCRIPTION = 'Policies whose controls this task demonstrates.';

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
      <Section title="Policies" description={SECTION_DESCRIPTION}>
        <Text>Could not load policies. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section title="Policies" description={SECTION_DESCRIPTION}>
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (visibleGroups.length === 0) {
    return (
      <Section title="Policies" description={SECTION_DESCRIPTION}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Document />
            </EmptyMedia>
            <EmptyTitle>No policies yet</EmptyTitle>
            <EmptyDescription>
              No policies reference this task through its mapped controls.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Section>
    );
  }

  return (
    <Section
      title="Policies"
      description={`${visibleCount} ${visibleCount === 1 ? 'policy' : 'policies'} whose controls this task demonstrates.`}
    >
      <Stack gap="6">
        {visibleGroups.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
    </Section>
  );
}

function ControlGroupHeader({
  name,
  count,
  trigger,
}: {
  name: string;
  count: number;
  trigger?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <HStack gap="2" align="center">
        <Heading level="5" as="h3">
          {name}
        </Heading>
        <Badge variant="secondary">{count}</Badge>
      </HStack>
      {trigger}
    </div>
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
        <Stack gap="3">
          <ControlGroupHeader
            name={control.name}
            count={policies.length}
            trigger={
              <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-90">
                <ChevronRight size={14} />
                {label}
              </CollapsibleTrigger>
            }
          />
          <CollapsibleContent>
            <PolicyList policies={policies} orgId={orgId} />
          </CollapsibleContent>
        </Stack>
      </Collapsible>
    );
  }

  return (
    <Stack gap="3">
      <ControlGroupHeader name={control.name} count={policies.length} />
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
    <ItemGroup>
      {policies.map((policy) => (
        <Item
          key={policy.id}
          variant="outline"
          size="sm"
          render={<Link href={`/${orgId}/policies/${policy.id}`} />}
        >
          <ItemContent>
            <ItemTitle>{policy.name}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant="secondary">{policy.status}</Badge>
            {policy.frequency ? (
              <Badge variant="outline">{policy.frequency}</Badge>
            ) : null}
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
