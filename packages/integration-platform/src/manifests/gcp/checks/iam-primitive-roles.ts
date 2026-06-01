import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { resolveGcpProjectIds } from './shared';

/** Primitive roles grant broad, non-least-privilege access at the project level. */
const PRIMITIVE_ROLES: Record<string, FindingSeverity> = {
  'roles/owner': 'high',
  'roles/editor': 'medium',
};

interface IamBinding {
  role: string;
  members?: string[];
}

/**
 * IAM least-privilege check (direct API, no SCC). Reads the project IAM policy
 * via Cloud Resource Manager v3 getIamPolicy and flags primitive role bindings
 * (roles/owner, roles/editor) — the GCP analog of over-privileged access.
 */
export const iamPrimitiveRolesCheck: IntegrationCheck = {
  id: 'gcp-iam-no-primitive-roles',
  name: 'IAM — no primitive owner/editor roles',
  description:
    'Flags primitive role bindings (roles/owner, roles/editor) on GCP projects, which violate least privilege.',
  service: 'iam',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP IAM check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      const policy = await ctx.post<{ bindings?: IamBinding[] }>(
        `/v3/projects/${encodeURIComponent(projectId)}:getIamPolicy`,
        { options: { requestedPolicyVersion: 3 } },
      );
      const bindings = policy.bindings ?? [];
      let violations = 0;

      for (const binding of bindings) {
        const severity = PRIMITIVE_ROLES[binding.role];
        const members = binding.members ?? [];
        if (severity && members.length > 0) {
          violations++;
          ctx.fail({
            title: `Primitive role in use: ${binding.role}`,
            description: `Project "${projectId}" grants the primitive role "${binding.role}" to ${members.length} member(s).`,
            resourceType: 'gcp-project',
            resourceId: projectId,
            severity,
            remediation: `Replace "${binding.role}" bindings with least-privilege predefined or custom roles.`,
            evidence: { projectId, role: binding.role, memberCount: members.length },
          });
        }
      }

      if (violations === 0) {
        ctx.pass({
          title: 'No primitive owner/editor roles',
          description: `Project "${projectId}" has no primitive role bindings.`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          evidence: { projectId, bindingCount: bindings.length },
        });
      }
    }
  },
};
