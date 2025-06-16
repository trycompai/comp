import {
  Control,
  FrameworkInstance,
  Policy,
  RequirementMap,
  FrameworkEditorFramework,
  PolicyStatus,
} from "@comp/db/types";

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
