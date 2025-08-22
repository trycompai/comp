'use server';

import { Control, type Task } from '@db';
import { FrameworkInstanceWithComplianceScore } from '../components/types';
import { computeFrameworkStats } from '../lib/compute';
import { FrameworkInstanceWithControls } from '../types';

/**
 * Gets all framework instances for an organization with compliance calculations
 * @param organizationId - The ID of the organization
 * @returns Array of frameworks with compliance percentages
 */
export async function getFrameworkWithComplianceScores({
  frameworksWithControls,
  tasks,
}: {
  frameworksWithControls: FrameworkInstanceWithControls[];
  tasks: (Task & { controls: Control[] })[];
}): Promise<FrameworkInstanceWithComplianceScore[]> {
  const frameworksWithComplianceScores = frameworksWithControls.map((frameworkInstance) => {
    const { complianceScore } = computeFrameworkStats(frameworkInstance, tasks);

    return {
      frameworkInstance,
      complianceScore: complianceScore,
    };
  });

  return frameworksWithComplianceScores;
}
