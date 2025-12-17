/**
 * JumpCloud API Types
 *
 * Types for JumpCloud System Users API v1
 * @see https://docs.jumpcloud.com/api/1.0/index.html
 */

/**
 * JumpCloud System User
 * Represents a user in JumpCloud's directory
 */
export interface JumpCloudUser {
  /** Unique identifier for the user */
  _id: string;

  /** User's login username */
  username: string;

  /** User's email address (required, globally unique) */
  email: string;

  /** User's first name */
  firstname?: string;

  /** User's last name */
  lastname?: string;

  /** User's display name */
  displayname?: string;

  /** User's job title */
  jobTitle?: string;

  /** Department the user belongs to */
  department?: string;

  /** Cost center */
  costCenter?: string;

  /** Employee identifier */
  employeeIdentifier?: string;

  /** Employee type (e.g., full-time, contractor) */
  employeeType?: string;

  /** Company name */
  company?: string;

  /** User's location */
  location?: string;

  /** Description / notes about the user */
  description?: string;

  /** Manager's user ID */
  manager?: string;

  /** User's current state */
  state: 'ACTIVATED' | 'SUSPENDED' | 'STAGED' | 'PENDING_LOCK_STATE';

  /** Whether the user account is activated */
  activated: boolean;

  /** Whether the user account is suspended */
  suspended: boolean;

  /** Whether MFA is enabled for the user */
  mfa?: {
    configured: boolean;
    exclusion: boolean;
    exclusionUntil?: string;
  };

  /** Whether TOTP is enabled */
  totp_enabled?: boolean;

  /** Whether the user has admin privileges */
  sudo?: boolean;

  /** Whether this is an LDAP binding user */
  ldap_binding_user?: boolean;

  /** Whether password never expires */
  password_never_expires?: boolean;

  /** Account creation timestamp */
  created?: string;

  /** Last password set timestamp */
  password_date?: string;

  /** Account locked status */
  account_locked?: boolean;

  /** Account locked date */
  account_locked_date?: string;

  /** User's phone numbers */
  phoneNumbers?: Array<{
    type: string;
    number: string;
  }>;

  /** User's addresses */
  addresses?: Array<{
    type: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;

  /** External source synchronization */
  external_source_type?: string;

  /** External DN (for AD/LDAP synced users) */
  external_dn?: string;

  /** Organization ID */
  organization?: string;
}

/**
 * Response from JumpCloud System Users list endpoint
 */
export interface JumpCloudUsersResponse {
  /** Total count of users matching the query */
  totalCount: number;

  /** Array of user objects */
  results: JumpCloudUser[];
}

/**
 * Simplified employee record for sync
 */
export interface JumpCloudEmployee {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username: string;
  jobTitle?: string;
  department?: string;
  employeeType?: string;
  managerId?: string;
  status: 'active' | 'suspended' | 'staged';
  mfaEnabled: boolean;
  isAdmin: boolean;
  createdAt?: string;
}
