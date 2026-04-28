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
  usePolicyEvidenceTasks,
  type PolicyEvidenceTaskGroup,
} from '../hooks/usePolicyEvidenceTasks';

const COLLAPSE_THRESHOLD = 5;
const SECTION_DESCRIPTION = 'Tasks attached to the controls mapped to this policy.';

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { groups, count, isLoading, error } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <Section title="Evidence Tasks" description={SECTION_DESCRIPTION}>
        <Text>Could not load evidence tasks. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section title="Evidence Tasks" description={SECTION_DESCRIPTION}>
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (groups.length === 0) {
    return (
      <Section title="Evidence Tasks" description={SECTION_DESCRIPTION}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Document />
            </EmptyMedia>
            <EmptyTitle>No evidence tasks yet</EmptyTitle>
            <EmptyDescription>
              Map at least one control to see the tasks that demonstrate this policy.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Section>
    );
  }

  return (
    <Section
      title="Evidence Tasks"
      description={`${count} task${count === 1 ? '' : 's'} attached to the controls mapped to this policy.`}
    >
      <Stack gap="6">
        {groups.map((group) => (
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
  group: PolicyEvidenceTaskGroup;
  orgId: string;
}) {
  const { control, tasks } = group;

  if (tasks.length === 0) {
    return (
      <Stack gap="3">
        <ControlGroupHeader name={control.name} count={0} />
        <Text size="sm" variant="muted">
          No tasks attached to this control.
        </Text>
      </Stack>
    );
  }

  if (tasks.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <Stack gap="3">
          <ControlGroupHeader
            name={control.name}
            count={tasks.length}
            trigger={
              <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-90">
                <ChevronRight size={14} />
                Show {tasks.length} tasks
              </CollapsibleTrigger>
            }
          />
          <CollapsibleContent>
            <TaskList tasks={tasks} orgId={orgId} />
          </CollapsibleContent>
        </Stack>
      </Collapsible>
    );
  }

  return (
    <Stack gap="3">
      <ControlGroupHeader name={control.name} count={tasks.length} />
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
    <ItemGroup>
      {tasks.map((task) => (
        <Item
          key={task.id}
          variant="outline"
          size="sm"
          render={<Link href={`/${orgId}/tasks/${task.id}`} />}
        >
          <ItemContent>
            <ItemTitle>{task.title}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant="secondary">{task.status}</Badge>
            {task.frequency ? <Badge variant="outline">{task.frequency}</Badge> : null}
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
