'use client';

import { TaskStatus } from '@db';
import { Badge, HStack, Stack, Text } from '@trycompai/design-system';
import Link from 'next/link';

interface LinkedTask {
  id: string;
  title: string;
  status: TaskStatus;
  controls: { id: string; name: string }[];
}

interface LinkedWorkProps {
  orgId: string;
  tasks: LinkedTask[];
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.todo]: 'To do',
  [TaskStatus.in_progress]: 'In progress',
  [TaskStatus.in_review]: 'In review',
  [TaskStatus.done]: 'Done',
  [TaskStatus.not_relevant]: 'Not relevant',
  [TaskStatus.failed]: 'Failed',
};

export function LinkedWork({ orgId, tasks }: LinkedWorkProps) {
  const doneCount = tasks.filter(
    (t) => t.status === TaskStatus.done || t.status === TaskStatus.not_relevant,
  ).length;
  const completionPct = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  const uniqueControls = new Map<string, { id: string; name: string }>();
  for (const t of tasks) {
    for (const c of t.controls) uniqueControls.set(c.id, c);
  }
  const controls = [...uniqueControls.values()];

  return (
    <HStack gap="lg" align="start">
      <div className="flex-1">
        <Stack gap="xs">
          <HStack justify="between" align="baseline">
            <Text size="sm" weight="medium">
              Linked tasks
            </Text>
            <Text size="xs" variant="muted">
              {doneCount}/{tasks.length} done · {completionPct}%
            </Text>
          </HStack>
          {tasks.length === 0 ? (
            <Text size="xs" variant="muted">
              No tasks linked. Link tasks from the Tasks tab to track mitigation progress.
            </Text>
          ) : (
            <Stack gap="xs">
              {tasks.map((t) => (
                <HStack key={t.id} justify="between" align="center">
                  <Link href={`/${orgId}/tasks/${t.id}`} className="text-sm hover:underline">
                    {t.title}
                  </Link>
                  <Badge>{STATUS_LABEL[t.status]}</Badge>
                </HStack>
              ))}
            </Stack>
          )}
        </Stack>
      </div>
      <div className="flex-1">
        <Stack gap="xs">
          <Text size="sm" weight="medium">
            Linked controls
          </Text>
          {controls.length === 0 ? (
            <Text size="xs" variant="muted">
              No controls linked (derived from task ↔ control relations).
            </Text>
          ) : (
            <Stack gap="xs">
              {controls.map((c) => (
                <Link
                  key={c.id}
                  href={`/${orgId}/controls/${c.id}`}
                  className="text-sm hover:underline"
                >
                  {c.name}
                </Link>
              ))}
            </Stack>
          )}
        </Stack>
      </div>
    </HStack>
  );
}
