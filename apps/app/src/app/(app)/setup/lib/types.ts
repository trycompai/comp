export type CSuiteEntry = {
  name: string;
  title: string;
};

export type ReportSignatory = {
  fullName: string;
  jobTitle: string;
  email: string;
};

export type CompanyDetails = {
  frameworkIds: string[];
  organizationName: string;
  website: string;
  describe: string;
  industry: string;
  teamSize: string;
  cSuite: CSuiteEntry[];
  reportSignatory: ReportSignatory;
  devices: string;
  authentication: string;
  workLocation: string;
  infrastructure: string;
  dataTypes: string;
  software?: string;
  geo: string;
  shipping: {
    fullName: string;
    address: string;
    phone: string;
  };
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
  description?: string;
  skippable?: boolean;
};
