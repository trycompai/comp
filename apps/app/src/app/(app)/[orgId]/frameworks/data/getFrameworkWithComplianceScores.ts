'use server';

import { Control, type Task } from '@db';
import type { FrameworkInstanceWithComplianceScore } from '@/lib/types/framework';
import { computeFrameworkStats } from '../lib/compute';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';

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
  tasks: (Task & {
    controls: Control[];
    evidenceAutomations?: Array<{
      isEnabled: boolean;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
      }>;
    }>;
  })[];
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
