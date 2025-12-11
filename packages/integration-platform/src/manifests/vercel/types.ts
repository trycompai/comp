/**
 * Vercel API Response Types
 */

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  framework?: string;
  devCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  nodeVersion?: string;
  serverlessFunctionRegion?: string;
}

export interface VercelProjectsResponse {
  projects: VercelProject[];
  pagination?: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  type: 'LAMBDAS';
  created: number;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  creator: {
    uid: string;
    email?: string;
    username?: string;
  };
  meta?: Record<string, string>;
  target?: 'production' | 'staging' | null;
  aliasError?: {
    code: string;
    message: string;
  };
  aliasAssigned?: number;
}

export interface VercelDeploymentsResponse {
  deployments: VercelDeployment[];
  pagination?: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export interface VercelWebhook {
  id: string;
  url: string;
  events: string[];
  projectIds?: string[];
  createdAt: number;
}

export interface VercelWebhooksResponse {
  webhooks?: VercelWebhook[];
}

export interface VercelIntegrationConfiguration {
  id: string;
  slug?: string;
  integrationId: string;
  ownerId: string;
  teamId?: string;
  projectId?: string;
  createdAt: number;
  updatedAt: number;
  scopes?: string[];
  disabledAt?: number;
}

export interface VercelNotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook';
  name: string;
  createdAt: number;
}

export interface VercelAlert {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
  projectId?: string;
  notificationChannels: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VercelUser {
  id: string;
  email: string;
  name?: string;
  username: string;
  avatar?: string;
}

export interface VercelTeam {
  id: string;
  slug: string;
  name?: string;
  createdAt: number;
  avatar?: string;
}

export interface VercelUserResponse {
  user: VercelUser;
}
