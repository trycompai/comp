// Google Workspace Admin SDK types

export interface GoogleWorkspaceUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
  isEnrolledIn2Sv: boolean;
  isEnforcedIn2Sv: boolean;
  suspended: boolean;
  archived: boolean;
  creationTime: string;
  lastLoginTime: string;
  orgUnitPath: string;
}

export interface GoogleWorkspaceUsersResponse {
  kind: string;
  users: GoogleWorkspaceUser[];
  nextPageToken?: string;
}

export interface GoogleWorkspaceOrgUnit {
  orgUnitId: string;
  orgUnitPath: string;
  name: string;
  description?: string;
  parentOrgUnitId?: string;
  parentOrgUnitPath?: string;
}

export interface GoogleWorkspaceOrgUnitsResponse {
  kind: string;
  organizationUnits: GoogleWorkspaceOrgUnit[];
}

export interface GoogleWorkspaceDomain {
  domainName: string;
  isPrimary: boolean;
  verified: boolean;
  creationTime: string;
}

export interface GoogleWorkspaceDomainsResponse {
  kind: string;
  domains: GoogleWorkspaceDomain[];
}

// Role types
export interface GoogleWorkspaceRole {
  roleId: string;
  roleName: string;
  roleDescription?: string;
  isSystemRole: boolean;
  isSuperAdminRole: boolean;
}

export interface GoogleWorkspaceRolesResponse {
  kind: string;
  items: GoogleWorkspaceRole[];
  nextPageToken?: string;
}

export interface GoogleWorkspaceRoleAssignment {
  roleAssignmentId: string;
  roleId: string;
  assignedTo: string; // User ID
  scopeType: 'CUSTOMER' | 'ORG_UNIT';
  orgUnitId?: string;
}

export interface GoogleWorkspaceRoleAssignmentsResponse {
  kind: string;
  items: GoogleWorkspaceRoleAssignment[];
  nextPageToken?: string;
}
