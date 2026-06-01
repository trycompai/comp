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

export interface IsmsDocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentType: string;
  clause: string | null;
  sortOrder: number;
  requirementLinks: IsmsRequirementLink[];
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
