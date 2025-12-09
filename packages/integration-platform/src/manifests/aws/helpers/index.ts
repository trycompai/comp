/**
 * AWS Helpers
 *
 * Shared utilities for AWS checks. Import these in your checks:
 *
 * ```ts
 * import { createAWSClients, listAllUsers } from '../helpers';
 * ```
 */

export {
  createAWSClients,
  getAccessKeyLastUsed,
  getUserAccessKeys,
  getUserMFADevices,
  isAccessKeyCredentials,
  isRoleCredentials,
  listAllUsers,
  listUserGroups,
  lookupIAMEvents,
  type AWSAccessKeyCredentials,
  type AWSClients,
  type AWSCredentials,
  type AWSRoleCredentials,
  type SecurityHubFinding,
} from './aws-client';
