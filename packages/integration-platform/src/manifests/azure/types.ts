/**
 * Azure API Types
 * Types for Azure REST API responses
 */

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location?: string;
  tags?: Record<string, string>;
}

export interface AzureListResponse<T> {
  value: T[];
  nextLink?: string;
}

export interface AzureSecurityAlert {
  id: string;
  name: string;
  type: string;
  properties: {
    alertDisplayName: string;
    alertType: string;
    compromisedEntity: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low' | 'Informational';
    status: 'Active' | 'Resolved' | 'Dismissed';
    intent: string;
    startTimeUtc: string;
    endTimeUtc?: string;
    remediationSteps?: string[];
    resourceIdentifiers?: Array<{
      type: string;
      azureResourceId?: string;
    }>;
  };
}

export interface AzureSecurityAssessment {
  id: string;
  name: string;
  type: string;
  properties: {
    displayName: string;
    status: {
      code: 'Healthy' | 'Unhealthy' | 'NotApplicable';
      cause?: string;
      description?: string;
    };
    resourceDetails: {
      source: string;
      id?: string;
    };
    metadata?: {
      severity: 'High' | 'Medium' | 'Low';
      category?: string;
      description?: string;
      remediationDescription?: string;
    };
  };
}

export interface AzureRoleAssignment {
  id: string;
  name: string;
  type: string;
  properties: {
    roleDefinitionId: string;
    principalId: string;
    principalType: 'User' | 'Group' | 'ServicePrincipal' | 'Application';
    scope: string;
    createdOn?: string;
    updatedOn?: string;
  };
}

export interface AzureRoleDefinition {
  id: string;
  name: string;
  type: string;
  properties: {
    roleName: string;
    description: string;
    type: 'BuiltInRole' | 'CustomRole';
    permissions: Array<{
      actions: string[];
      notActions: string[];
      dataActions?: string[];
      notDataActions?: string[];
    }>;
    assignableScopes: string[];
  };
}

export interface AzureAdUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  accountEnabled: boolean;
  createdDateTime?: string;
}

export interface AzureAlertRule {
  id: string;
  name: string;
  type: string;
  location: string;
  properties: {
    description?: string;
    severity: 0 | 1 | 2 | 3 | 4;
    enabled: boolean;
    scopes: string[];
    evaluationFrequency?: string;
    windowSize?: string;
    actions?: {
      actionGroups?: string[];
    };
  };
}

export interface AzureActionGroup {
  id: string;
  name: string;
  type: string;
  location: string;
  properties: {
    groupShortName: string;
    enabled: boolean;
    emailReceivers?: Array<{
      name: string;
      emailAddress: string;
      status: string;
    }>;
    webhookReceivers?: Array<{
      name: string;
      serviceUri: string;
    }>;
  };
}
