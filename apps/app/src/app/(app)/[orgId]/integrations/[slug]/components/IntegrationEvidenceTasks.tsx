'use client';

import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { Button } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useMemo } from 'react';

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
        {mappedTasks.map((mappedTask) => {
          const task = taskByTemplateId.get(mappedTask.id);

          return (
            <div key={mappedTask.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task?.name ?? mappedTask.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {task?.description ||
                    'This task is mapped to the integration template, but is not available in this organization yet.'}
                </p>
              </div>

              {task ? (
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/${orgId}/tasks/${task.taskId}`} />}
                  iconRight={<ArrowRight size={14} />}
                >
                  Open
                </Button>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Not added</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getMappedTasks(provider: IntegrationProvider): MappedTask[] {
  const mappedTasks = (provider as IntegrationProvider & { mappedTasks?: MappedTask[] })
    .mappedTasks;

  return Array.isArray(mappedTasks) ? mappedTasks : [];
}
