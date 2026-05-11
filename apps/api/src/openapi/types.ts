export type PublicVisibility = 'public' | 'hidden' | 'excluded';

export type PublicOperationMetadata = {
  summary: string;
  description: string;
  href?: string;
  sidebarTitle?: string;
  visibility?: PublicVisibility;
  content?: string;
  security?: Array<Record<string, string[]>>;
  codeSamples?: Array<{
    lang: string;
    label?: string;
    source: string;
  }>;
};

export type PublicTagMetadata = {
  description: string;
  group?: string;
  visibility?: PublicVisibility;
};

export type OpenApiOperation = {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  [key: string]: unknown;
};
