'use client';

import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { useMemo } from 'react';
import { EvidenceTaskRow } from './EvidenceTaskRow';

export interface IntegrationTaskTemplate {
  id: string;
  taskId: string;
  name: string;
  description: string;
}

interface IntegrationEvidenceTasksProps {
  provider: IntegrationProvider;
  taskTemplates: IntegrationTaskTemplate[];
  orgId: string;
}

interface MappedTask {
  id: string;
  name: string;
}

export function IntegrationEvidenceTasks({
  provider,
  taskTemplates,
  orgId,
}: IntegrationEvidenceTasksProps) {
  const mappedTasks = getMappedTasks(provider);
  const taskByTemplateId = useMemo(
    () => new Map(taskTemplates.map((task) => [task.id, task])),
    [taskTemplates],
  );

  if (mappedTasks.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Evidence tasks</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tasks this integration can help automate or verify.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            {mappedTasks.length}
          </span>
        </div>
      </div>

      <div className="divide-y">
        {mappedTasks.map((mappedTask) => (
          <EvidenceTaskRow
            key={mappedTask.id}
            fallbackName={mappedTask.name}
            task={taskByTemplateId.get(mappedTask.id)}
            orgId={orgId}
          />
        ))}
      </div>
    </section>
  );
}

function getMappedTasks(provider: IntegrationProvider): MappedTask[] {
  const mappedTasks = (provider as IntegrationProvider & { mappedTasks?: MappedTask[] })
    .mappedTasks;

  return Array.isArray(mappedTasks) ? mappedTasks : [];
}
