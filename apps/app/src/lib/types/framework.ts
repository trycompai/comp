import type {
  Control,
  CustomFramework,
  FrameworkEditorFramework,
  FrameworkInstance,
  PolicyStatus,
  RequirementMap,
} from '@db';

export type FrameworkInstanceWithControls = FrameworkInstance & {
  framework: FrameworkEditorFramework | null;
  customFramework: CustomFramework | null;
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
