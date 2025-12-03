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
  listAllUsers,
  listUserGroups,
  lookupIAMEvents,
  type AWSClients,
  type AWSCredentials,
} from './aws-client';
