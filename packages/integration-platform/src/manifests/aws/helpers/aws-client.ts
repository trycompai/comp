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
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';

export interface AWSCredentials {
  roleArn: string;
  externalId: string;
  region: string;
}

export interface AWSClients {
  iam: IAMClient;
  cloudtrail: CloudTrailClient;
  region: string;
}

/**
 * Creates authenticated AWS clients by assuming the configured IAM role.
 *
 * @param credentials - The AWS credentials from the integration connection
 * @param log - Logger function from check context
 * @returns Authenticated AWS service clients
 */
export async function createAWSClients(
  credentials: AWSCredentials,
  log: (message: string) => void,
): Promise<AWSClients> {
  const { roleArn, externalId, region } = credentials;

  log(`Assuming role ${roleArn} in region ${region}`);

  // Create STS client (no credentials needed - uses environment/instance role)
  const sts = new STSClient({ region });

  // Assume the cross-account role
  const assumeRoleResponse = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: 'CompSecurityAudit',
      DurationSeconds: 3600, // 1 hour
    }),
  );

  if (!assumeRoleResponse.Credentials) {
    throw new Error('Failed to assume role - no credentials returned');
  }

  const tempCredentials = {
    accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
    secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
    sessionToken: assumeRoleResponse.Credentials.SessionToken!,
  };

  log('Successfully assumed role, creating service clients');

  // Create authenticated clients
  return {
    iam: new IAMClient({ region, credentials: tempCredentials }),
    cloudtrail: new CloudTrailClient({ region, credentials: tempCredentials }),
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
