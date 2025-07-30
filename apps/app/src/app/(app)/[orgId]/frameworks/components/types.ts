import type { FrameworkInstance, IntegrationResult, Policy, Task } from '@db';
import { FrameworkInstanceWithControls } from '../types';

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

export interface FrameworkInstanceWithComplianceScore {
  frameworkInstance: FrameworkInstanceWithControls;
  complianceScore: number;
}
