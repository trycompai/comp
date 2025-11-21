import {
  Control,
  FrameworkEditorFramework,
  FrameworkInstance,
  PolicyStatus,
  RequirementMap,
} from '@/lib/db';

export type FrameworkInstanceWithControls = FrameworkInstance & {
  framework: FrameworkEditorFramework;
  controls: (Control & {
    policies: Array<{
      id: string;
      name: string;
      status: PolicyStatus;
    }>;
    requirementsMapped: RequirementMap[];
  })[];
};
