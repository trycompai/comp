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
  usePolicyEvidenceTasks,
  type PolicyEvidenceTaskGroup,
} from '../hooks/usePolicyEvidenceTasks';

const COLLAPSE_THRESHOLD = 5;

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { groups, count, isLoading, error } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <Section
        title="Evidence Tasks"
        description="Tasks attached to the controls mapped to this policy."
      >
        <Text>Could not load evidence tasks. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section
        title="Evidence Tasks"
        description="Tasks attached to the controls mapped to this policy."
      >
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (groups.length === 0) {
    return (
      <Section
        title="Evidence Tasks"
        description="Tasks attached to the controls mapped to this policy."
      >
        <Text>
          Map at least one control to see the tasks that demonstrate this policy.
        </Text>
      </Section>
    );
  }

  return (
    <Section
      title="Evidence Tasks"
      description={`${count} task${count === 1 ? '' : 's'} attached to the controls mapped to this policy.`}
    >
      <Stack gap="4">
        {groups.map((group) => (
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
  group: PolicyEvidenceTaskGroup;
  orgId: string;
}) {
  const { control, tasks } = group;

  if (tasks.length === 0) {
    return (
      <Stack gap="2">
        <Text weight="medium">{control.name}</Text>
        <Text size="sm" variant="muted">
          No tasks attached to this control.
        </Text>
      </Stack>
    );
  }

  if (tasks.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <HStack justify="between" align="center">
          <Text weight="medium">{control.name}</Text>
          <CollapsibleTrigger className="inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Show {tasks.length} tasks
          </CollapsibleTrigger>
        </HStack>
        <CollapsibleContent>
          <TaskList tasks={tasks} orgId={orgId} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Stack gap="2">
      <Text weight="medium">{control.name}</Text>
      <TaskList tasks={tasks} orgId={orgId} />
    </Stack>
  );
}

function TaskList({
  tasks,
  orgId,
}: {
  tasks: PolicyEvidenceTaskGroup['tasks'];
  orgId: string;
}) {
  return (
    <Stack gap="1">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/${orgId}/tasks/${task.id}`}
          className="block rounded px-3 py-2 hover:bg-muted"
        >
          <HStack justify="between" align="center">
            <Text>{task.title}</Text>
            <HStack gap="2">
              <Badge>{task.status}</Badge>
              {task.frequency ? <Badge>{task.frequency}</Badge> : null}
            </HStack>
          </HStack>
        </Link>
      ))}
    </Stack>
  );
}
