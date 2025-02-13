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

export interface Control {
  name: string;
  description: string;
  domain: string;
  requirements: ControlRequirement[];
}

export interface ControlRequirement {
  id: string;
  type: string;
  description: string;
  policyId?: string;
}

export interface Policy {
  metadata: {
    id: string;
    slug: string;
    name: string;
    description: string;
    type: string;
    usedBy: {
      [key: string]: string[];
    };
  };
  content: JsonArray;
}
