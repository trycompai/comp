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
import { usePolicyEvidenceTasks } from '../hooks/usePolicyEvidenceTasks';

const SECTION_TITLE = 'Evidence Tasks';
const SECTION_DESCRIPTION = 'Tasks that implement this policy.';

interface TaskRow {
  taskId: string;
  taskTitle: string;
  status: string;
  frequency: string | null;
  controlId: string;
  controlName: string;
}

function TaskStatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const styles = (() => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
      case 'in_review':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'done':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      case 'failed':
        return 'bg-red-500/15 text-red-700 dark:text-red-300';
      case 'not_relevant':
      case 'todo':
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

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const router = useRouter();
  const { groups, isLoading, error } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (error) {
    return (
      <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <Text>Could not load evidence tasks. Please try again.</Text>
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

  const rows: TaskRow[] = [];
  for (const group of groups) {
    for (const task of group.tasks) {
      rows.push({
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        frequency: task.frequency,
        controlId: group.control.id,
        controlName: group.control.name,
      });
    }
  }

  if (rows.length === 0) {
    return (
      <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <Text variant="muted">
          No evidence tasks yet. Map a control with tasks attached above.
        </Text>
      </Section>
    );
  }

  const handleRowClick = (taskId: string) => {
    router.push(`/${orgId}/tasks/${taskId}`);
  };

  return (
    <Section title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Control</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Frequency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={`${row.controlId}:${row.taskId}`}
              onClick={() => handleRowClick(row.taskId)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Link
                  href={`/${orgId}/tasks/${row.taskId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block"
                >
                  <Text size="sm" weight="medium">
                    {row.taskTitle}
                  </Text>
                </Link>
              </TableCell>
              <TableCell>
                <Text size="sm" variant="muted">
                  {row.controlName}
                </Text>
              </TableCell>
              <TableCell>
                <TaskStatusPill status={row.status} />
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
