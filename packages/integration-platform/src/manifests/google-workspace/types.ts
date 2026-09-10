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
  /**
   * The assignee's directory ID. This is a USER id when `assigneeType` is
   * 'user' (or absent), and a GROUP id when it is 'group' — the two id spaces
   * are distinct, so this must be read together with `assigneeType`.
   */
  assignedTo: string;
  /**
   * Who the role is assigned to. Google added this field after the original
   * API shape, and omits it on older/user assignments, so treat `undefined`
   * as 'user'.
   */
  assigneeType?: 'user' | 'group';
  scopeType: 'CUSTOMER' | 'ORG_UNIT';
  orgUnitId?: string;
}

export interface GoogleWorkspaceRoleAssignmentsResponse {
  kind: string;
  items: GoogleWorkspaceRoleAssignment[];
  nextPageToken?: string;
}

// ── Reports API (admin audit log) ───────────────────────────────────────
// GET /admin/reports/v1/activity/users/all/applications/admin
// Requires the admin.reports.audit.readonly scope.

export interface GoogleWorkspaceActivityParameter {
  name: string;
  value?: string;
  boolValue?: boolean;
  intValue?: string;
  multiValue?: string[];
}

export interface GoogleWorkspaceActivityEvent {
  /** Event group, e.g. "DELEGATED_ADMIN_SETTINGS", "USER_SETTINGS" */
  type?: string;
  /** Specific event, e.g. "ASSIGN_ROLE", "GRANT_ADMIN_PRIVILEGE" */
  name: string;
  parameters?: GoogleWorkspaceActivityParameter[];
}

export interface GoogleWorkspaceActivity {
  kind?: string;
  id: {
    time: string;
    uniqueQualifier?: string;
    applicationName?: string;
    customerId?: string;
  };
  /** Absent for system-generated activity, hence optional email. */
  actor?: {
    callerType?: string;
    email?: string;
    profileId?: string;
  };
  ipAddress?: string;
  events?: GoogleWorkspaceActivityEvent[];
}

export interface GoogleWorkspaceActivitiesResponse {
  kind?: string;
  items?: GoogleWorkspaceActivity[];
  nextPageToken?: string;
}

// ── Groups ──────────────────────────────────────────────────────────────
// Requires the admin.directory.group.readonly scope.

export interface GoogleWorkspaceGroupMember {
  id?: string;
  email?: string;
  /** USER for people, GROUP for a nested group, CUSTOMER for whole-domain. */
  type?: 'USER' | 'GROUP' | 'CUSTOMER';
  role?: 'OWNER' | 'MANAGER' | 'MEMBER';
  status?: string;
}

export interface GoogleWorkspaceGroupMembersResponse {
  kind?: string;
  members?: GoogleWorkspaceGroupMember[];
  nextPageToken?: string;
}

export interface GoogleWorkspaceGroup {
  id: string;
  email: string;
  name?: string;
  description?: string;
}
