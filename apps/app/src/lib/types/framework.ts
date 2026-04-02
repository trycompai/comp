import type {
  Control,
  FrameworkEditorFramework,
  FrameworkInstance,
  PolicyStatus,
  RequirementMap,
} from '@db';

export type FrameworkInstanceWithControls = FrameworkInstance & {
  framework: FrameworkEditorFramework;
  controls: (Control & {
    policies: Array<{
      id: string;
      name: string;
      status: PolicyStatus;
    }>;
    requirementsMapped: RequirementMap[];
    controlDocumentTypes?: Array<{
      formType: string;
    }>;
  })[];
};

export interface FrameworkInstanceWithComplianceScore {
  frameworkInstance: FrameworkInstanceWithControls;
  complianceScore: number;
}
