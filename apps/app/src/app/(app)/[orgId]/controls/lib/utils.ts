import { StatusType } from '@/components/status-indicator';
import type { ControlWithRelations } from '../data/queries';

export function getControlStatus(control: ControlWithRelations): StatusType {
  const policies = control.policies || [];
  const tasks = control.tasks || [];

  const allPoliciesArePublished = policies.every((policy) => policy.status === 'published');
  const allTasksAreCompleted = tasks.every((task) => task.status === 'done' || task.status === 'not_relevant');

  if (!allPoliciesArePublished && !allTasksAreCompleted) {
    return 'not_started';
  }

  if (allPoliciesArePublished && allTasksAreCompleted) {
    return 'completed';
  }

  if (!allPoliciesArePublished && tasks.length === 0) {
    return 'not_started';
  }

  return 'in_progress';
}
