'use server';

import { Control, type PolicyStatus, type Task } from '@db';
import { FrameworkInstanceWithComplianceScore } from '../components/types';
import { FrameworkInstanceWithControls } from '../types'; // This now has policies with selected fields

// Define the type for the policies array based on the select in FrameworkInstanceWithControls
type SelectedPolicy = {
  id: string;
  name: string;
  status: PolicyStatus;
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
    // Flatten all policies across controls for this framework instance
    const controls = frameworkInstance.controls;
    const allPolicies: SelectedPolicy[] = controls.flatMap(
      (control) => (control.policies as SelectedPolicy[]) ?? [],
    );
    // Deduplicate policies by id to avoid counting the same policy mapped to multiple controls
    const uniquePoliciesMap = new Map<string, SelectedPolicy>();
    for (const p of allPolicies) uniquePoliciesMap.set(p.id, p);
    const uniquePolicies = Array.from(uniquePoliciesMap.values());
    const totalPolicies = uniquePolicies.length;
    const publishedPolicies = uniquePolicies.filter((p) => p.status === 'published').length;
    const policyRatio = totalPolicies > 0 ? publishedPolicies / totalPolicies : 0;

    // Tasks breakdown for this framework instance
    const controlIds = controls.map((c) => c.id);
    const frameworkTasks = tasks.filter((task) =>
      task.controls.some((c) => controlIds.includes(c.id)),
    );
    const totalTasks = frameworkTasks.length;
    const doneTasks = frameworkTasks.filter((t) => t.status === 'done').length;
    const taskRatio = totalTasks > 0 ? doneTasks / totalTasks : 1;

    // Blend policy and task progress equally
    const compliance = Math.round(((policyRatio + taskRatio) / 2) * 100);

    return {
      frameworkInstance,
      complianceScore: compliance,
    };
  });

  return frameworksWithComplianceScores;
}
