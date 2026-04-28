'use client';

import {
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTaskPolicies } from '../hooks/use-task-policies';

const SECTION_TITLE = 'Policies';
const SECTION_DESCRIPTION = 'Policies this task implements.';

interface PolicyRow {
  policyId: string;
  policyName: string;
  status: string;
  frequency: string | null;
  controlId: string;
  controlName: string;
}

function PolicyStatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const styles = (() => {
    switch (status) {
      case 'published':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      case 'needs_review':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'draft':
      case 'archived':
      default:
        return 'bg-muted text-muted-foreground';
    }
  })();
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${styles}`}
    >
      {label}
    </span>
  );
}

export function TaskPolicies() {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const { groups, isLoading, error } = useTaskPolicies({
    taskId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <Text>Could not load policies. Please try again.</Text>
      </Section>
    );
  }

  if (isLoading) {
    return (
      <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <Text variant="muted">Loading...</Text>
      </Section>
    );
  }

  const rows: PolicyRow[] = [];
  for (const group of groups) {
    for (const policy of group.policies) {
      rows.push({
        policyId: policy.id,
        policyName: policy.name,
        status: policy.status,
        frequency: policy.frequency,
        controlId: group.control.id,
        controlName: group.control.name,
      });
    }
  }

  if (rows.length === 0) {
    return (
      <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <Text variant="muted">
          No policies reference this task through its mapped controls.
        </Text>
      </Section>
    );
  }

  const handleRowClick = (policyId: string) => {
    router.push(`/${orgId}/policies/${policyId}`);
  };

  return (
    <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Policy</TableHead>
            <TableHead>Control</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Frequency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={`${row.controlId}:${row.policyId}`}
              onClick={() => handleRowClick(row.policyId)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Link
                  href={`/${orgId}/policies/${row.policyId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block"
                >
                  <Text size="sm" weight="medium">
                    {row.policyName}
                  </Text>
                </Link>
              </TableCell>
              <TableCell>
                <Text size="sm" variant="muted">
                  {row.controlName}
                </Text>
              </TableCell>
              <TableCell>
                <PolicyStatusPill status={row.status} />
              </TableCell>
              <TableCell>
                <div className="capitalize">
                  <Text size="sm" variant="muted">
                    {row.frequency ?? '—'}
                  </Text>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}
