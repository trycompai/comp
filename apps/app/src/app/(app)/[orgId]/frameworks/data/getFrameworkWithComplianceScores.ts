'use server';

import {
  Control,
  // type Artifact, // Removed Artifact
  type Policy, // Policy might still be useful if full Policy objects were ever passed, but selected fields are more common now
  type PolicyStatus, // For the selected policy type
  type Task,
} from '@comp/db/types';
import { FrameworkInstanceWithComplianceScore } from '../components/types';
import { FrameworkInstanceWithControls } from '../types'; // This now has policies with selected fields

// Define the type for the policies array based on the select in FrameworkInstanceWithControls
type SelectedPolicy = {
  id: string;
  name: string;
  status: PolicyStatus;
};

/**
 * Checks if a control is compliant based on its policies and tasks
 * @param policies - The policies to check (selected fields)
 * @param tasks - The tasks to check
 * @returns boolean indicating if all policies and tasks are compliant
 */
const isControlCompliant = (
  policies: SelectedPolicy[], // Use the specific selected type
  tasks: Task[],
) => {
  // If there are no policies, the control is not compliant (or has no policy evidence)
  if (!policies || policies.length === 0) {
    // Depending on business logic, an empty policies array might mean non-compliant or N/A.
    // For now, sticking to original logic of false if empty.
    return false;
  }

  const totalPolicies = policies.length;
  const completedPolicies = policies.filter((policy) => {
    return policy.status === 'published'; // Directly check status of the selected policy
  }).length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'done').length;

  return completedPolicies === totalPolicies && (totalTasks === 0 || completedTasks === totalTasks);
};

/**
 * Gets all framework instances for an organization with compliance calculations
 * @param organizationId - The ID of the organization
 * @returns Array of frameworks with compliance percentages
 */
export async function getFrameworkWithComplianceScores({
  frameworksWithControls,
  tasks,
}: {
  frameworksWithControls: FrameworkInstanceWithControls[]; // This type defines control.policies as SelectedPolicy[]
  tasks: (Task & { controls: Control[] })[];
}): Promise<FrameworkInstanceWithComplianceScore[]> {
  // Calculate compliance for each framework
  const frameworksWithComplianceScores = frameworksWithControls.map((frameworkInstance) => {
    // Get all controls for this framework
    const controls = frameworkInstance.controls;

    console.log({ controls });

    // Calculate compliance percentage
    const totalControls = controls.length;
    const compliantControls = controls.filter((control) => {
      const controlTasks = tasks.filter((task) => task.controls.some((c) => c.id === control.id));
      // control.policies here matches SelectedPolicy[] from FrameworkInstanceWithControls
      return isControlCompliant(control.policies, controlTasks);
    }).length;

    const compliance =
      totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0;

    return {
      frameworkInstance,
      complianceScore: compliance,
    };
  });

  return frameworksWithComplianceScores;
}
