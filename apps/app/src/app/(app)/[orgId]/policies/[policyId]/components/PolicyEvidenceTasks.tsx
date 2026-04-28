'use client';

import {
  Badge,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronRight } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  usePolicyEvidenceTasks,
  type PolicyEvidenceTaskGroup,
} from '../hooks/usePolicyEvidenceTasks';

const COLLAPSE_THRESHOLD = 5;
const SECTION_TITLE = 'Evidence Tasks';
const DEFAULT_DESCRIPTION = 'Tasks attached to the controls mapped to this policy.';
const CAPTION_CLASS =
  'text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground';

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { groups, count, isLoading, error } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text>Could not load evidence tasks. Please try again.</Text>
      </SectionShell>
    );
  }

  if (isLoading) {
    return (
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">Loading...</Text>
      </SectionShell>
    );
  }

  if (groups.length === 0) {
    return (
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          Map at least one control above to see evidence tasks.
        </Text>
      </SectionShell>
    );
  }

  const populated = groups.filter((g) => g.tasks.length > 0);

  // If every control has zero tasks, fall back to the page-level empty state
  // rather than rendering an empty card with no content.
  if (populated.length === 0) {
    return (
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          Map at least one control above to see evidence tasks.
        </Text>
      </SectionShell>
    );
  }

  const description = `${count} task${count === 1 ? '' : 's'} attached to controls mapped to this policy.`;

  return (
    <SectionShell description={description}>
      <Stack gap="4">
        {populated.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
    </SectionShell>
  );
}

function SectionShell({
  description,
  children,
}: {
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Section title={SECTION_TITLE} description={description}>
      <Card width="full">
        <CardContent>{children}</CardContent>
      </Card>
    </Section>
  );
}

function ControlGroupCaption({
  name,
  count,
  trigger,
}: {
  name: string;
  count: number;
  trigger?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className={CAPTION_CLASS}>
        {name}
        {count > 1 ? (
          <span className="text-muted-foreground/60 ml-1.5 font-medium normal-case tracking-normal">
            · {count}
          </span>
        ) : null}
      </h3>
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

  if (tasks.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <Stack gap="2">
          <ControlGroupCaption
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
    <Stack gap="2">
      <ControlGroupCaption name={control.name} count={tasks.length} />
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

