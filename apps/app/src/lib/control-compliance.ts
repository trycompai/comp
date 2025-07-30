import type { PolicyStatus } from '@db';

// Define the expected structure for policies (typically with selected fields)
export type SelectedPolicy = {
  // Add other fields like id, name if they are available and used by functions here
  status: PolicyStatus | null; // Allowing null status as per original ArtifactWithRelations
};

/**
 * Checks if a specific policy is completed (e.g., published)
 * @param policy - The policy to check
 * @returns boolean indicating if the policy is completed
 */
export function isPolicyCompleted(policy: SelectedPolicy): boolean {
  if (!policy) return false;
  return policy.status === 'published';
}

/**
 * Determines if a control is compliant based on its policies
 * @param policies - The control's policies
 * @returns boolean indicating if the control is compliant
 */
export function isControlCompliant(policies: SelectedPolicy[]): boolean {
  if (!policies || policies.length === 0) {
    return false;
  }

  const totalPolicies = policies.length;
  const completedPolicies = policies.filter(isPolicyCompleted).length;

  return completedPolicies === totalPolicies;
}

/**
 * Calculate control status based on its policies
 * @param policies - The control's policies
 * @returns Control status as "not_started", "in_progress", or "completed"
 */
export function calculateControlStatus(
  policies: SelectedPolicy[],
): 'not_started' | 'in_progress' | 'completed' {
  if (!policies || policies.length === 0) return 'not_started';

  const totalPolicies = policies.length;
  const completedPolicies = policies.filter(isPolicyCompleted).length;

  if (completedPolicies === 0) return 'not_started';
  if (completedPolicies === totalPolicies) return 'completed';
  return 'in_progress';
}
