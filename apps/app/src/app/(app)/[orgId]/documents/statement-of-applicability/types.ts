import type { Prisma } from '@db';

// Types for SOA Framework Configuration
export type SOAFrameworkConfiguration = Prisma.SOAFrameworkConfigurationGetPayload<{
  include: {
    framework: true;
  };
}>;

// Types for SOA Document
export type SOADocument = Prisma.SOADocumentGetPayload<{
  include: {
    answers: {
      where: {
        isLatestAnswer: true;
      };
    };
  };
}>;

// Type for Framework with SOA Configuration and Document
export type FrameworkWithSOAData = {
  frameworkId: string;
  framework: {
    id: string;
    name: string;
    description: string | null;
    visible: boolean;
  };
  configuration: SOAFrameworkConfiguration['framework'] extends null
    ? null
    : Omit<SOAFrameworkConfiguration, 'framework'> | null;
  document: SOADocument | null;
};

// Type for Framework with Latest Documents (used in SOAFrameworkTable)
export type FrameworkWithLatestDocument = {
  framework: {
    id: string;
    name: string;
    description: string | null;
    visible: boolean;
  };
  frameworkId: string;
  configuration: Omit<SOAFrameworkConfiguration, 'framework'>;
  document: SOADocument | null;
};

