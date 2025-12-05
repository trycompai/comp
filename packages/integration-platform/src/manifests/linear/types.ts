export interface LinearUser {
  id: string;
  name: string;
  email: string;
  admin: boolean;
  active: boolean;
  createdAt: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  private: boolean;
  description?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  state: string;
  startDate?: string;
  targetDate?: string;
}

export interface LinearOrganization {
  id: string;
  name: string;
  urlKey: string;
  samlEnabled: boolean;
  scimEnabled: boolean;
  allowedAuthServices: string[];
}

export interface LinearWebhook {
  id: string;
  url: string;
  enabled: boolean;
  resourceTypes: string[];
}

export interface LinearIntegration {
  id: string;
  service: string;
  createdAt: string;
}

// GraphQL response types
export interface LinearUsersResponse {
  users: {
    nodes: LinearUser[];
  };
}

export interface LinearTeamsResponse {
  teams: {
    nodes: LinearTeam[];
  };
}

export interface LinearOrganizationResponse {
  organization: LinearOrganization;
}
