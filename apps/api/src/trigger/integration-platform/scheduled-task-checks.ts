import { isTaskCheckEnabled } from '../../integration-platform/utils/disabled-task-checks';

/** A provider's check reduced to what the orchestrator needs to schedule it. */
export interface ProviderCheck {
  id: string;
  taskMapping: string | null;
  taskRunEnabledByDefault: boolean;
}

/**
 * Resolve a connection's checks from either the static code manifest or the
 * dynamic DB-backed check map for that provider slug.
 */
export function resolveProviderChecks({
  manifest,
  dynamicChecks,
}: {
  manifest:
    | {
        checks?: Array<{
          id: string;
          taskMapping?: string | null;
          taskRunEnabledByDefault?: boolean;
        }>;
      }
    | undefined;
  dynamicChecks: ProviderCheck[] | undefined;
}): ProviderCheck[] {
  if (manifest?.checks) {
    return manifest.checks.map((c) => ({
      id: c.id,
      taskMapping: c.taskMapping ?? null,
      taskRunEnabledByDefault: c.taskRunEnabledByDefault ?? true,
    }));
  }
  return dynamicChecks ?? [];
}

export function getEnabledChecksForScheduledTask({
  checks,
  taskTemplateId,
  taskId,
  metadata,
}: {
  checks: ProviderCheck[];
  taskTemplateId: string | null;
  taskId: string;
  metadata: unknown;
}): string[] {
  return checks
    .filter(
      (c) =>
        c.taskMapping === taskTemplateId &&
        isTaskCheckEnabled({
          metadata,
          taskId,
          checkId: c.id,
          enabledByDefault: c.taskRunEnabledByDefault,
        }),
    )
    .map((c) => c.id);
}
