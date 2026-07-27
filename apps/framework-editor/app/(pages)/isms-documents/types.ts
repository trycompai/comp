export interface IsmsRequirementLink {
  id: string;
  frameworkId: string;
  requirementId: string;
  requirement: {
    id: string;
    name: string;
    identifier: string;
    framework: { id: string; name: string };
  };
}

export interface IsmsControlLink {
  id: string;
  frameworkId: string;
  controlTemplateId: string;
  controlTemplate: {
    id: string;
    name: string;
  };
}

export interface IsmsDocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentType: string;
  clause: string | null;
  sortOrder: number;
  requirementLinks: IsmsRequirementLink[];
  controlLinks: IsmsControlLink[];
}

export interface FrameworkRequirementOption {
  id: string;
  name: string;
  identifier: string;
}

/** A requirement mapped to a template, normalized for the cell. */
export interface MappedRequirement {
  id: string;
  name: string;
}

/** A control template mapped to a template, normalized for the cell. */
export interface MappedControl {
  id: string;
  name: string;
}
