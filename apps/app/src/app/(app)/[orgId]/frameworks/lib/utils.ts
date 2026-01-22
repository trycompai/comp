import { StatusType } from '@/components/status-indicator';
// Import base types explicitly
import type { Control, PolicyStatus } from '@db';
import { Task } from '@db';

// Define the expected structure for policies passed to getControlStatus
// This should match the data structure provided by the calling code (e.g., from a Prisma select)
type SelectedPolicy = {
  // Assuming at least status is present. Add other fields like id, name if available and needed.
  status: PolicyStatus | null; // Allowing null status based on original ArtifactWithRelations
};

// Function to determine control status based on policies and tasks
export function getControlStatus(
  policies: SelectedPolicy[], // Use the defined type for policies
  tasks: (Task & { controls: Control[] })[], // tasks parameter seems fine
  controlId: string, // controlId seems fine, used for filtering tasks
): StatusType {
  const controlTasks = tasks.filter((task) => task.controls.some((c) => c.id === controlId));

  // All policies are draft or none
  const allPoliciesDraft = // Renamed from allArtifactsDraft
    !policies.length ||
    policies.every(
      (policy) => policy.status === 'draft', // Simplified from artifact.policy.status
    );
  // All tasks are todo or none
  const allTasksTodo = !controlTasks.length || controlTasks.every((task) => task.status === 'todo');

  // All policies are published (and there are policies) AND all tasks are done (or no tasks)
  const allPoliciesPublished = // Renamed from allArtifactsPublished
    policies.length > 0 &&
    policies.every(
      (policy) => policy.status === 'published', // Simplified from artifact.policy.status
    );
  const allTasksDone =
    controlTasks.length > 0 && controlTasks.every((task) => task.status === 'done' || task.status === 'not_relevant');

  if (allPoliciesPublished && (controlTasks.length === 0 || allTasksDone)) return 'completed';
  if (allPoliciesDraft && allTasksTodo) return 'not_started';
  return 'in_progress';
}
