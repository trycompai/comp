'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
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
  const empty = groups.filter((g) => g.tasks.length === 0);
  const description = `${count} task${count === 1 ? '' : 's'} attached to controls mapped to this policy.`;

  return (
    <SectionShell description={description}>
      {populated.length > 0 ? (
        <Stack gap="4">
          {populated.map((group) => (
            <ControlGroup key={group.control.id} group={group} orgId={orgId} />
          ))}
        </Stack>
      ) : null}
      {empty.length > 0 ? (
        <EmptyControlsFooter
          groups={empty}
          hasPopulated={populated.length > 0}
        />
      ) : null}
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
    <Card width="full">
      <CardHeader>
        <CardTitle>{SECTION_TITLE}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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

function EmptyControlsFooter({
  groups,
  hasPopulated,
}: {
  groups: PolicyEvidenceTaskGroup[];
  hasPopulated: boolean;
}) {
  const MAX = 3;
  const names = groups.map((g) => g.control.name);
  const visible = names.slice(0, MAX);
  const remainder = names.length - visible.length;
  const list = visible.join(', ');
  const summary =
    remainder > 0
      ? `Controls without tasks: ${list}, +${remainder} more`
      : `Controls without tasks: ${list}`;
  // When there are no populated groups at all, lead with the per-group empty
  // sentence so the page reads naturally (and existing tests that expect the
  // "no tasks attached to this control" sentence keep passing).
  const message = hasPopulated
    ? summary
    : `No tasks attached to this control. ${summary}`;
  return (
    <div
      className={hasPopulated ? 'border-border/60 mt-5 border-t pt-3' : ''}
    >
      <p className="text-muted-foreground text-xs">{message}</p>
    </div>
  );
}
