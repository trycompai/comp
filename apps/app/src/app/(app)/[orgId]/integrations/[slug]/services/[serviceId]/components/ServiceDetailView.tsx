'use client';

import { useConnectionServices } from '@/hooks/use-integration-platform';
import { Breadcrumb, Button, Stack } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ServiceMeta {
  id: string;
  name: string;
  description: string;
  implemented?: boolean;
  mappedTasks?: Array<{ id: string; name: string }>;
}

interface TaskTemplate {
  id: string;
  taskId: string;
  name: string;
  description: string;
}

interface ServiceDetailViewProps {
  provider: IntegrationProviderResponse;
  service: ServiceMeta;
  connections: ConnectionListItemResponse[];
  connectionId: string | null;
  taskTemplates: TaskTemplate[];
  tasksErrored: boolean;
  orgId: string;
  slug: string;
}

export function ServiceDetailView({
  provider,
  service,
  connections,
  connectionId,
  taskTemplates,
  tasksErrored,
  orgId,
  slug,
}: ServiceDetailViewProps) {
  // Resolve the connection this service belongs to (URL param, else first active).
  const effectiveConnectionId = useMemo(() => {
    if (connectionId) return connectionId;
    const active = connections.find(
      (c) => c.status === 'active' || c.status === 'pending',
    );
    return active?.id ?? null;
  }, [connectionId, connections]);

  const { services: connectionServices, updateServices } =
    useConnectionServices(effectiveConnectionId);
  const liveService = connectionServices.find((s) => s.id === service.id);
  const isEnabled = liveService?.enabled ?? false;
  const isImplemented = service.implemented !== false;
  // Only services present in the connection's live service list can be toggled.
  // (e.g. AWS baseline services are always scanned and aren't in the toggle list.)
  const isManageable = Boolean(liveService);
  const [toggling, setToggling] = useState(false);

  const taskByTemplateId = useMemo(
    () => new Map(taskTemplates.map((t) => [t.id, t])),
    [taskTemplates],
  );
  const mappedTasks = service.mappedTasks ?? [];

  const handleToggle = async () => {
    if (!effectiveConnectionId || toggling || !liveService) return;
    setToggling(true);
    const next = !isEnabled;
    try {
      await updateServices(service.id, next);
      toast.success(
        `${service.name} scanning ${next ? 'enabled' : 'disabled'} in Cloud Tests`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Stack gap="lg">
      <Breadcrumb
        items={[
          {
            label: 'Integrations',
            href: `/${orgId}/integrations`,
            props: { render: <Link href={`/${orgId}/integrations`} /> },
          },
          {
            label: provider.name,
            href: `/${orgId}/integrations/${slug}`,
            props: { render: <Link href={`/${orgId}/integrations/${slug}`} /> },
          },
          { label: service.name, isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="rounded-xl border bg-background p-5">
        <h1 className="text-base font-semibold">{service.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
      </div>

      {/* Cloud Tests scanning toggle */}
      <section className="rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Cloud Tests scanning</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Whether Cloud Tests scans this service for security findings. This
              controls scanning only — it&apos;s separate from the evidence below.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label={`Toggle Cloud Tests scanning for ${service.name}`}
            disabled={toggling || !effectiveConnectionId || !isImplemented || !isManageable}
            onClick={() => void handleToggle()}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                isEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Evidence provided */}
      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Evidence provided</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Evidence tasks this service&apos;s checks satisfy when they pass.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {mappedTasks.length}
            </span>
          </div>
        </div>

        {mappedTasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            This service doesn&apos;t map to any evidence task yet.
          </p>
        ) : (
          <div className="divide-y">
            {mappedTasks.map((mapped) => {
              const task = taskByTemplateId.get(mapped.id);
              return (
                <div
                  key={mapped.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {task?.name ?? mapped.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {task?.description ||
                        'Mapped to this template, but the task is not in this organization yet.'}
                    </p>
                  </div>
                  {task ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/${orgId}/tasks/${task.taskId}`} />}
                      iconRight={<ArrowRight size={14} />}
                    >
                      View task
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tasksErrored ? 'Couldn’t load tasks' : 'Not added'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Stack>
  );
}
