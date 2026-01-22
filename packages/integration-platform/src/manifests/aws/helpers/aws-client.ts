/**
 * AWS Client Helper
 *
 * Shared helper for AWS checks. Handles STS AssumeRole and creates
 * authenticated clients for AWS services.
 *
 * Usage in a check:
 * ```ts
 * import { createAWSClients } from '../helpers/aws-client';
 *
 * const aws = await createAWSClients(ctx.credentials, ctx.log);
 * const users = await aws.iam.send(new ListUsersCommand({}));
 * ```
 */

import {
  CloudTrailClient,
  LookupEventsCommand,
  type LookupEventsCommandOutput,
} from '@aws-sdk/client-cloudtrail';
import {
  GetAccessKeyLastUsedCommand,
  IAMClient,
  ListAccessKeysCommand,
  ListGroupsForUserCommand,
  ListMFADevicesCommand,
  ListUsersCommand,
  type ListAccessKeysCommandOutput,
  type ListGroupsForUserCommandOutput,
  type ListMFADevicesCommandOutput,
  type ListUsersCommandOutput,
} from '@aws-sdk/client-iam';
import { SecurityHubClient } from '@aws-sdk/client-securityhub';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';

/**
 * IAM Role credentials (new method - more secure)
 */
export interface AWSRoleCredentials {
  roleArn: string;
  externalId: string;
  region: string;
}

/**
 * Access Key credentials (legacy method)
 */
export interface AWSAccessKeyCredentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
}

/**
 * Union type for all supported AWS credential types
 */
export type AWSCredentials = AWSRoleCredentials | AWSAccessKeyCredentials;

/**
 * Type guard to check if credentials are IAM Role based
 */
export function isRoleCredentials(creds: AWSCredentials): creds is AWSRoleCredentials {
  return 'roleArn' in creds && 'externalId' in creds;
}

/**
 * Type guard to check if credentials are Access Key based (legacy)
 */
export function isAccessKeyCredentials(creds: AWSCredentials): creds is AWSAccessKeyCredentials {
  return 'access_key_id' in creds && 'secret_access_key' in creds;
}

export interface AWSClients {
  iam: IAMClient;
  cloudtrail: CloudTrailClient;
  securityHub: SecurityHubClient;
  region: string;
}

/**
 * Creates authenticated AWS clients.
 * Supports both IAM Role assumption (new) and direct access keys (legacy).
 *
 * @param credentials - The AWS credentials from the integration connection
 * @param log - Logger function from check context
 * @returns Authenticated AWS service clients
 */
export async function createAWSClients(
  credentials: AWSCredentials,
  log: (message: string) => void,
): Promise<AWSClients> {
  let awsCredentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  let region: string;

  if (isRoleCredentials(credentials)) {
    // New method: IAM Role assumption
    const { roleArn, externalId, region: credRegion } = credentials;
    region = credRegion;

    log(`Assuming role ${roleArn} in region ${region}`);

    const sts = new STSClient({ region });
    const assumeRoleResponse = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId,
        RoleSessionName: 'CompSecurityAudit',
        DurationSeconds: 3600,
      }),
    );

    if (!assumeRoleResponse.Credentials) {
      throw new Error('Failed to assume role - no credentials returned');
    }

    awsCredentials = {
      accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
      secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
      sessionToken: assumeRoleResponse.Credentials.SessionToken!,
    };

    log('Successfully assumed role, creating service clients');
  } else if (isAccessKeyCredentials(credentials)) {
    // Legacy method: Direct access keys
    const { access_key_id, secret_access_key, region: credRegion } = credentials;
    region = credRegion;

    log(`Using direct access keys in region ${region}`);

    awsCredentials = {
      accessKeyId: access_key_id,
      secretAccessKey: secret_access_key,
    };

    log('Using access key credentials, creating service clients');
  } else {
    throw new Error('Invalid AWS credentials - must provide either roleArn or access_key_id');
  }

  // Create authenticated clients
  return {
    iam: new IAMClient({ region, credentials: awsCredentials }),
    cloudtrail: new CloudTrailClient({ region, credentials: awsCredentials }),
    securityHub: new SecurityHubClient({ region, credentials: awsCredentials }),
    region,
  };
}

// ============================================================================
// Convenience functions for common operations
// ============================================================================

/**
 * List all IAM users with pagination
 */
export async function listAllUsers(iam: IAMClient): Promise<ListUsersCommandOutput['Users']> {
  const users: NonNullable<ListUsersCommandOutput['Users']> = [];
  let marker: string | undefined;

  do {
    const response = await iam.send(new ListUsersCommand({ Marker: marker }));
    if (response.Users) {
      users.push(...response.Users);
    }
    marker = response.Marker;
  } while (marker);

  return users;
}

/**
 * List groups that a user belongs to
 */
export async function listUserGroups(
  iam: IAMClient,
  userName: string,
): Promise<ListGroupsForUserCommandOutput['Groups']> {
  const response = await iam.send(new ListGroupsForUserCommand({ UserName: userName }));
  return response.Groups || [];
}

/**
 * Get MFA devices for a user
 */
export async function getUserMFADevices(
  iam: IAMClient,
  userName: string,
): Promise<ListMFADevicesCommandOutput['MFADevices']> {
  const response = await iam.send(new ListMFADevicesCommand({ UserName: userName }));
  return response.MFADevices || [];
}

/**
 * Get access keys for a user
 */
export async function getUserAccessKeys(
  iam: IAMClient,
  userName: string,
): Promise<ListAccessKeysCommandOutput['AccessKeyMetadata']> {
  const response = await iam.send(new ListAccessKeysCommand({ UserName: userName }));
  return response.AccessKeyMetadata || [];
}

/**
 * Get last used info for an access key
 */
export async function getAccessKeyLastUsed(
  iam: IAMClient,
  accessKeyId: string,
): Promise<{ lastUsedDate?: Date; serviceName?: string; region?: string }> {
  const response = await iam.send(new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKeyId }));
  return {
    lastUsedDate: response.AccessKeyLastUsed?.LastUsedDate,
    serviceName: response.AccessKeyLastUsed?.ServiceName,
    region: response.AccessKeyLastUsed?.Region,
  };
}

/**
 * Lookup recent IAM events in CloudTrail
 */
export async function lookupIAMEvents(
  cloudtrail: CloudTrailClient,
  options: {
    startTime?: Date;
    endTime?: Date;
    maxResults?: number;
  } = {},
): Promise<LookupEventsCommandOutput['Events']> {
  const { startTime, endTime, maxResults = 50 } = options;

  // Default to last 7 days if not specified
  const defaultStartTime = new Date();
  defaultStartTime.setDate(defaultStartTime.getDate() - 7);

  const response = await cloudtrail.send(
    new LookupEventsCommand({
      LookupAttributes: [
        {
          AttributeKey: 'EventSource',
          AttributeValue: 'iam.amazonaws.com',
        },
      ],
      StartTime: startTime || defaultStartTime,
      EndTime: endTime || new Date(),
      MaxResults: maxResults,
    }),
  );

  return response.Events || [];
}

/**
 * Security Hub finding as returned by the API
 */
export interface SecurityHubFinding {
  id: string;
  title: string;
  description: string;
  remediation: string;
  status: string;
  severity: string;
  resourceType: string;
  resourceId: string;
  awsAccountId: string;
  region: string;
  complianceStatus: string;
  generatorId: string;
  createdAt: string;
  updatedAt: string;
}
