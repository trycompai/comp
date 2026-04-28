'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { groups, count, isLoading, error } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text>Could not load evidence tasks. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">Loading...</Text>
      </Section>
    );
  }

  if (groups.length === 0) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          Map at least one control above to see evidence tasks.
        </Text>
      </Section>
    );
  }

  const populated = groups.filter((g) => g.tasks.length > 0);

  // If every control has zero tasks, fall back to the page-level empty state
  // rather than rendering an empty card with no content.
  if (populated.length === 0) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          Map at least one control above to see evidence tasks.
        </Text>
      </Section>
    );
  }

  const description = `${count} task${count === 1 ? '' : 's'} attached to controls mapped to this policy.`;

  return (
    <Section title={SECTION_TITLE} description={description}>
      <Stack gap="6">
        {populated.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
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
    <div className="flex items-baseline gap-1.5 mb-2">
      <h4 className={CAPTION_CLASS}>{name}</h4>
      {count > 1 ? (
        <span className="text-xs text-muted-foreground/70">· {count}</span>
      ) : null}
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
        <div>
          <ControlGroupCaption
            name={control.name}
            count={tasks.length}
            trigger={
              <CollapsibleTrigger className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-90">
                <ChevronRight size={12} />
                <span>Show {tasks.length} tasks</span>
              </CollapsibleTrigger>
            }
          />
          <CollapsibleContent>
            <TaskList tasks={tasks} orgId={orgId} />
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div>
      <ControlGroupCaption name={control.name} count={tasks.length} />
      <TaskList tasks={tasks} orgId={orgId} />
    </div>
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
    <div className="overflow-hidden rounded-md border divide-y divide-border">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/${orgId}/tasks/${task.id}`}
          className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm">{task.title}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
            <span className="capitalize">{formatStatus(task.status)}</span>
            {task.frequency ? (
              <>
                <span aria-hidden>·</span>
                <span className="capitalize">{task.frequency}</span>
              </>
            ) : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
