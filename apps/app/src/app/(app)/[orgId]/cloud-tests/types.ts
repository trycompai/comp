export type FailedIntegration = {
  id: string;
  integrationId: string;
  name: string;
  error: string;
};

export type IntegrationRunOutput = {
  success: boolean;
  organizationId: string;
  integrationsCount: number;
  batchHandleId?: string;
  errors?: string[];
  failedIntegrations?: FailedIntegration[];
};


