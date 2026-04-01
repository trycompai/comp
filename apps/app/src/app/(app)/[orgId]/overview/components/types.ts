import type { FrameworkInstance, IntegrationResult, Policy, Task } from '@db';

export type {
  FrameworkInstanceWithControls,
  FrameworkInstanceWithComplianceScore,
} from '@/lib/types/framework';

export interface ComplianceScoresProps {
  policiesCompliance: number;
  tasksCompliance: number;
  cloudTestsCompliance: number;
  overallCompliance: number;
  frameworkCompliance: {
    id: string;
    name: string;
    compliance: number;
  }[];
  policies: Policy[];
  tasks: Task[];
  tests: IntegrationResult[];
}

export interface FrameworkWithCompliance {
  framework: FrameworkInstance;
  compliance: number;
}
