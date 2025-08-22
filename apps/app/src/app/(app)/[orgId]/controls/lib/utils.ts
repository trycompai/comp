import { StatusType } from '@/components/status-indicator';
import type { ControlWithRelations } from '../data/queries';

export function getControlStatus(control: ControlWithRelations): StatusType {
  const policies = control.policies || [];
  const tasks = control.tasks || [];

  if (!policies.length && !tasks.length) {
    return 'not_started';
  }

  if (!tasks.length) {
    return 'completed';
  }

  const hasUnpublishedPolicies = policies.some((policy) => policy.status !== 'published');
  const hasUncompletedTasks = tasks.some((task) => task.status !== 'done');
  const allPoliciesAreDraft = policies.every((policy) => policy.status === 'draft');

  if (allPoliciesAreDraft) {
    return 'not_started';
  }

  if (hasUnpublishedPolicies || hasUncompletedTasks) {
    return 'in_progress';
  }

  return 'completed';
}
