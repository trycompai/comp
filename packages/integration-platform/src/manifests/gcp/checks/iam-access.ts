import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { createGCPClients, getProjectIAMPolicy, listServiceAccounts } from '../helpers';
import type { GCPCredentials } from '../types';

/**
 * GCP IAM Access Review Check
 *
 * Fetches IAM bindings and service accounts for access review.
 * Maps to: Access Review Log task
 */
export const iamAccessCheck: IntegrationCheck = {
  id: 'iam-access',
  name: 'IAM Access Review',
  description: 'Fetch IAM policies and service accounts from GCP for access review',
  taskMapping: TASK_TEMPLATES.accessReviewLog,
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP IAM Access Review check');

    const credentials = ctx.credentials as unknown as GCPCredentials;

    let gcp;
    try {
      gcp = await createGCPClients(credentials, ctx.log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ctx.fail({
        title: 'Failed to Connect to GCP',
        resourceType: 'connection',
        resourceId: 'gcp-auth',
        severity: 'critical',
        description: `Could not authenticate with GCP: ${errorMessage}`,
        remediation: 'Verify the service account key is valid and has the required permissions',
        evidence: { error: String(error) },
      });
      return;
    }

    const projectId = gcp.projectId;
    ctx.log(`Fetching IAM policy for project: ${projectId}`);

    // Fetch IAM policy
    let iamPolicy;
    try {
      iamPolicy = await getProjectIAMPolicy(gcp.client, projectId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to Fetch IAM Policy',
        resourceType: 'iam-policy',
        resourceId: projectId,
        severity: 'high',
        description: `Could not fetch IAM policy: ${errorMessage}`,
        remediation: 'Ensure the service account has the "Security Reviewer" role',
        evidence: { error: errorMessage, projectId },
      });
      return;
    }

    ctx.log(`Found ${iamPolicy.bindings?.length || 0} IAM bindings`);

    // Fetch service accounts
    ctx.log('Fetching service accounts...');
    const serviceAccounts: Array<{
      name: string;
      email: string;
      displayName?: string;
      disabled: boolean;
    }> = [];

    try {
      let pageToken: string | undefined;
      do {
        const response = await listServiceAccounts(gcp.client, projectId, pageToken);
        if (response.accounts) {
          serviceAccounts.push(...response.accounts);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch (error) {
      ctx.log(`Could not fetch service accounts: ${error}`);
    }

    ctx.log(`Found ${serviceAccounts.length} service accounts`);

    // Process IAM bindings to extract users and their roles
    const userRoles = new Map<string, string[]>();
    const roleMembers = new Map<string, string[]>();

    for (const binding of iamPolicy.bindings || []) {
      roleMembers.set(binding.role, binding.members);

      for (const member of binding.members) {
        const existing = userRoles.get(member) || [];
        existing.push(binding.role);
        userRoles.set(member, existing);
      }
    }

    // Build the access list
    const accessList = Array.from(userRoles.entries()).map(([member, roles]) => {
      // Parse member type (user:, serviceAccount:, group:, etc.)
      const [type, identifier] = member.includes(':') ? member.split(':', 2) : ['unknown', member];

      return {
        member,
        type,
        identifier,
        roles,
        roleCount: roles.length,
      };
    });

    // Categorize members
    const users = accessList.filter((a) => a.type === 'user');
    const serviceAccountMembers = accessList.filter((a) => a.type === 'serviceAccount');
    const groups = accessList.filter((a) => a.type === 'group');
    const domains = accessList.filter((a) => a.type === 'domain');

    // Pass with the full access list as evidence
    ctx.pass({
      title: 'IAM Access Review',
      resourceType: 'project',
      resourceId: projectId,
      description: `Retrieved IAM access for project ${projectId}: ${users.length} users, ${serviceAccountMembers.length} service accounts, ${groups.length} groups`,
      evidence: {
        projectId,
        totalBindings: iamPolicy.bindings?.length || 0,
        totalMembers: accessList.length,
        userCount: users.length,
        serviceAccountCount: serviceAccountMembers.length,
        groupCount: groups.length,
        domainCount: domains.length,
        reviewedAt: new Date().toISOString(),
        accessList,
        serviceAccounts: serviceAccounts.map((sa) => ({
          email: sa.email,
          displayName: sa.displayName,
          disabled: sa.disabled,
        })),
        rolesSummary: Array.from(roleMembers.entries()).map(([role, members]) => ({
          role,
          memberCount: members.length,
        })),
      },
    });

    ctx.log('GCP IAM Access Review check complete');
  },
};

