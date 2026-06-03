import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { resolveGcpProjectIds } from './shared';

/** Primitive roles grant broad, non-least-privilege access. */
const PRIMITIVE_ROLES: Record<string, FindingSeverity> = {
  'roles/owner': 'high',
  'roles/editor': 'medium',
};

interface IamBinding {
  role: string;
  members?: string[];
}

/** Read primitive-role IAM bindings for a resource, or null if it couldn't be read. */
async function getBindings(
  ctx: CheckContext,
  resourcePath: string,
): Promise<IamBinding[] | null> {
  try {
    const policy = await ctx.post<{ bindings?: IamBinding[] }>(
      `/${resourcePath}:getIamPolicy`,
      { options: { requestedPolicyVersion: 3 } },
    );
    return policy.bindings ?? [];
  } catch {
    return null;
  }
}

/**
 * Emit a fail-closed "could not verify" finding for a project whose IAM policy
 * couldn't be read. Used for both the project-level read (where getBindings
 * swallows the error and returns null) and the outer per-project catch, so an
 * unreadable project is never silently skipped (which would leave the RBAC task
 * stale-passing on unverified data).
 */
function failUnverifiedProject(
  ctx: CheckContext,
  projectId: string,
  error?: unknown,
): void {
  ctx.fail({
    title: `Could not verify IAM primitive roles: ${projectId}`,
    description: `IAM policy for project "${projectId}" could not be read, so primitive-role usage is unverified.`,
    resourceType: 'gcp-project',
    resourceId: projectId,
    severity: 'medium',
    remediation:
      'Grant resourcemanager.projects.getIamPolicy (e.g. roles/iam.securityReviewer) to the connection for this project, then re-run.',
    evidence: {
      projectId,
      ...(error !== undefined
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    },
  });
}

/**
 * IAM least-privilege check (direct API, no SCC). Evaluates primitive role
 * bindings (roles/owner, roles/editor) on the project AND its inherited
 * folders/organization (effective access). A pass is emitted only when the
 * full hierarchy was readable and clean, so the RBAC task isn't satisfied on
 * incomplete data.
 */
export const iamPrimitiveRolesCheck: IntegrationCheck = {
  id: 'gcp-iam-no-primitive-roles',
  name: 'IAM — no primitive owner/editor roles',
  description:
    'Flags primitive role bindings (roles/owner, roles/editor) on GCP projects and their inherited folders/organization.',
  service: 'iam',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP IAM check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      try {
        const projectBindings = await getBindings(
          ctx,
          `v3/projects/${encodeURIComponent(projectId)}`,
        );
        if (projectBindings === null) {
          // Couldn't read the project's own IAM policy (getBindings swallowed
          // the throw → null). Fail closed rather than silently skipping.
          failUnverifiedProject(ctx, projectId);
          continue;
        }

        // Resolve the ancestry (folders/org) so inherited bindings are evaluated.
        let hierarchyFullyEvaluated = true;
        const scopes: Array<{ label: string; bindings: IamBinding[] }> = [
          { label: `Project "${projectId}"`, bindings: projectBindings },
        ];
        try {
          const anc = await ctx.post<{
            ancestor?: Array<{ resourceId?: { type?: string; id?: string } }>;
          }>(`/v1/projects/${encodeURIComponent(projectId)}:getAncestry`, {});
          for (const a of anc.ancestor ?? []) {
            const type = a.resourceId?.type;
            const id = a.resourceId?.id;
            if (!id || type === 'project') continue;
            const resource =
              type === 'organization'
                ? `v3/organizations/${id}`
                : type === 'folder'
                  ? `v3/folders/${id}`
                  : null;
            if (!resource) continue;
            const bindings = await getBindings(ctx, resource);
            if (bindings === null) {
              hierarchyFullyEvaluated = false; // couldn't read this ancestor
              continue;
            }
            scopes.push({ label: `${type} ${id}`, bindings });
          }
        } catch {
          hierarchyFullyEvaluated = false;
        }

        let violations = 0;
        for (const scope of scopes) {
          for (const binding of scope.bindings) {
            const severity = PRIMITIVE_ROLES[binding.role];
            const members = binding.members ?? [];
            if (severity && members.length > 0) {
              violations++;
              ctx.fail({
                title: `Primitive role in use: ${binding.role}`,
                description: `${scope.label} grants the primitive role "${binding.role}" to ${members.length} member(s). Primitive roles violate least privilege.`,
                resourceType: 'gcp-project',
                resourceId: projectId,
                severity,
                remediation: `Replace "${binding.role}" bindings with least-privilege predefined or custom roles.`,
                evidence: { projectId, scope: scope.label, role: binding.role, memberCount: members.length },
              });
            }
          }
        }

        if (violations === 0) {
          if (hierarchyFullyEvaluated) {
            ctx.pass({
              title: 'No primitive owner/editor roles (project + inherited)',
              description: `Project "${projectId}" and its inherited folders/organization have no primitive (owner/editor) role bindings.`,
              resourceType: 'gcp-project',
              resourceId: projectId,
              evidence: { projectId, scope: 'project+inherited', inheritedBindingsEvaluated: true },
            });
          } else {
            // Inherited bindings couldn't be fully read — don't satisfy the task
            // on incomplete data.
            ctx.log(
              `GCP IAM: inherited bindings for "${projectId}" not fully readable; not asserting a pass`,
            );
          }
        }
      } catch (error) {
        // One project's API error must not abort the whole check — but it is
        // unverified, so emit a finding rather than warn-and-skip (an
        // all-projects-failed run would otherwise leave the task stale).
        failUnverifiedProject(ctx, projectId, error);
        continue;
      }
    }
  },
};
