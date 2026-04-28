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
  useTaskPolicies,
  type TaskPolicyGroup,
} from '../hooks/use-task-policies';

const COLLAPSE_THRESHOLD = 5;
const SECTION_TITLE = 'Policies';
const DEFAULT_DESCRIPTION = 'Policies whose controls this task demonstrates.';
const CAPTION_CLASS =
  'text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground';

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export function TaskPolicies() {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const { groups, isLoading, error } = useTaskPolicies({
    taskId,
    organizationId: orgId,
  });

  // Drop empty groups: a control with no policies is irrelevant noise on the
  // task page. Diverges intentionally from PolicyEvidenceTasks, which keeps
  // empty groups as a prompt to add tasks. The API is authoritative on which
  // policies to show — we don't filter by status here.
  const visibleGroups = groups.filter((group) => group.policies.length > 0);

  // Dedupe by policy ID — a single policy can appear under multiple controls
  // attached to the same task, but for the count we want unique policies.
  const visiblePolicyIds = new Set<string>();
  for (const group of visibleGroups) {
    for (const policy of group.policies) visiblePolicyIds.add(policy.id);
  }
  const visibleCount = visiblePolicyIds.size;

  if (error) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text>Could not load policies. Please try again.</Text>
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

  if (visibleGroups.length === 0) {
    return (
      <Section title={SECTION_TITLE} description={DEFAULT_DESCRIPTION}>
        <Text variant="muted">
          No policies reference this task through its mapped controls.
        </Text>
      </Section>
    );
  }

  const description = `${visibleCount} ${visibleCount === 1 ? 'policy' : 'policies'} whose controls this task demonstrates.`;

  return (
    <Section title={SECTION_TITLE} description={description}>
      <Stack gap="6">
        {visibleGroups.map((group) => (
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
  group: TaskPolicyGroup;
  orgId: string;
}) {
  const { control, policies } = group;
  const label =
    policies.length === 1 ? 'Show 1 policy' : `Show ${policies.length} policies`;

  if (policies.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <div>
          <ControlGroupCaption
            name={control.name}
            count={policies.length}
            trigger={
              <CollapsibleTrigger className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-90">
                <ChevronRight size={12} />
                <span>{label}</span>
              </CollapsibleTrigger>
            }
          />
          <CollapsibleContent>
            <PolicyList policies={policies} orgId={orgId} />
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div>
      <ControlGroupCaption name={control.name} count={policies.length} />
      <PolicyList policies={policies} orgId={orgId} />
    </div>
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
    <div className="divide-y divide-border/40">
      {policies.map((policy) => (
        <Link
          key={policy.id}
          href={`/${orgId}/policies/${policy.id}`}
          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-sm transition-colors"
        >
          <span className="text-sm">{policy.name}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{formatStatus(policy.status)}</span>
            {policy.frequency ? (
              <>
                <span aria-hidden>·</span>
                <span className="capitalize">{policy.frequency}</span>
              </>
            ) : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
