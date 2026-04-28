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
  useTaskPolicies,
  type TaskPolicyGroup,
} from '../hooks/use-task-policies';

const COLLAPSE_THRESHOLD = 5;
const SECTION_TITLE = 'Policies';
const DEFAULT_DESCRIPTION = 'Policies whose controls this task demonstrates.';
const CAPTION_CLASS =
  'text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground';

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
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text>Could not load policies. Please try again.</Text>
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

  if (visibleGroups.length === 0) {
    return (
      <SectionShell description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          No policies reference this task through its mapped controls.
        </Text>
      </SectionShell>
    );
  }

  const description = `${visibleCount} ${visibleCount === 1 ? 'policy' : 'policies'} whose controls this task demonstrates.`;

  return (
    <SectionShell description={description}>
      <Stack gap="4">
        {visibleGroups.map((group) => (
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
  group: TaskPolicyGroup;
  orgId: string;
}) {
  const { control, policies } = group;
  const label =
    policies.length === 1 ? 'Show 1 policy' : `Show ${policies.length} policies`;

  if (policies.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <Stack gap="2">
          <ControlGroupCaption
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
    <Stack gap="2">
      <ControlGroupCaption name={control.name} count={policies.length} />
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
