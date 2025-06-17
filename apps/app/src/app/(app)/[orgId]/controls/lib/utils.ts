import { StatusType } from '@/components/status-indicator';
import type { ControlWithRelations } from '../data/queries';

export function getControlStatus(control: ControlWithRelations): StatusType {
  const policies = control.policies || [];

  if (!policies.length) {
    return 'not_started';
  }

  const hasUnpublishedPolicies = policies.some((policy) => policy.status !== 'published');

  const allPoliciesAreDraft = policies.every((policy) => policy.status === 'draft');

  if (allPoliciesAreDraft) {
    return 'not_started';
  }

  if (hasUnpublishedPolicies) {
    return 'in_progress';
  }

  return 'completed';
}
