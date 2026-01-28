export interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
  connectionId: string;
  providerSlug: string;
  integration: {
    integrationId: string;
  };
}

export interface Provider {
  id: string;
  integrationId: string;
  name: string;
  displayName?: string;
  organizationId: string;
  lastRunAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isLegacy?: boolean;
  variables?: Record<string, unknown> | null;
  requiredVariables?: string[];
  accountId?: string;
  regions?: string[];
  supportsMultipleConnections?: boolean;
}
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
