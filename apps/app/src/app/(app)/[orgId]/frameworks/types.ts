import {
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
  })[];
};

export type RequirementMapWithControl = {
  id: string;
  requirementId: string | null;
  frameworkInstanceRequirementId: string | null;
  controlId: string;
  frameworkInstanceId: string;
  control: {
    id: string;
    name: string;
    description: string;
    tasks: { id: string; title: string; status: string }[];
    policies: { id: string; name: string; status: string }[];
  };
};

export type InstanceRequirementWithMaps = {
  id: string;
  frameworkInstanceId: string;
  name: string;
  identifier: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  requirementMaps: RequirementMapWithControl[];
};

export type TemplateRequirement = {
  id: string;
  frameworkId: string;
  name: string;
  identifier: string;
  description: string;
};

export type FrameworkInstanceDetail = FrameworkInstanceWithControls & {
  requirementDefinitions: TemplateRequirement[];
  frameworkInstanceRequirements: InstanceRequirementWithMaps[];
  requirementMaps: RequirementMapWithControl[];
};
