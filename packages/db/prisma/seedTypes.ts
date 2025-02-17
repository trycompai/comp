import type { JsonArray } from "@prisma/client/runtime/library";

export interface Framework {
  name: string;
  description: string;
  version: string;
}

export interface FrameworkCategory {
  name: string;
  description: string;
  code: string;
}

export interface Requirement {
  id: string;
  type: string;
  description: string;
  policyId?: string;
}

export interface Control {
  name: string;
  description: string;
  code: string;
  domain: string;
  categoryId: string;
  requirements: Requirement[];
}

export interface ControlRequirement {
  id: string;
  type: string;
  description: string;
  policyId?: string;
}

export interface Policy {
  type: string;
  metadata: {
    id: string;
    slug: string;
    name: string;
    description: string;
    usedBy: {
      [key: string]: string[];
    };
  };
  content: Array<{
    type: string;
    attrs?: {
      level?: number;
      [key: string]: unknown;
    };
    content?: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
}
