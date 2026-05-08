import type { FrameworkInstance } from '@db';

/**
 * Shape of framework instance as returned by getFrameworkInstances and used by
 * TaskList and TasksPageClient. Single source of truth to avoid type drift.
 */
export type FrameworkInstanceForTasks = Pick<FrameworkInstance, 'id'> & {
  framework: { id: string; name: string } | null;
  customFramework: { id: string; name: string } | null;
  requirementsMapped: { controlId: string }[];
};
