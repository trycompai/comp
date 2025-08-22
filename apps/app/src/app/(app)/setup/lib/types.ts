export type CompanyDetails = {
  frameworkIds: string[];
  organizationName: string;
  website: string;
  describe: string;
  industry: string;
  teamSize: string;
  devices: string;
  authentication: string;
  workLocation: string;
  infrastructure: string;
  dataTypes: string;
  software: string;
  geo: string;
};

export type ChatBubble = {
  type: 'system' | 'user';
  text: string;
  key?: keyof CompanyDetails;
  isEditing?: boolean;
};

export type Step = {
  key: keyof CompanyDetails;
  question: string;
  placeholder: string;
  options?: string[];
};
