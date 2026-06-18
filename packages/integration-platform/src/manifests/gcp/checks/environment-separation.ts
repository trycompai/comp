import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  classifyEnvironment,
  confirmsEnvironmentSeparation,
  envTagValues,
} from '../../environment-classification';
import { remediationForReadFailure, toHttpReadFailure } from '../../http-read-failure';

interface GcpProject {
  projectId: string;
  name?: string;
  labels?: Record<string, string>;
}

interface ResolvedProjects {
  projects: GcpProject[];
  /** True when UNSCOPED discovery hit the page cap (a scoped fetch is exact). */
  truncated: boolean;
  /** Set when a selected project could not be read (scoped path). */
  readError?: string;
}

/**
 * Classify a project into an environment bucket, or null if undetermined.
 * Explicit `environment`/`env` label values are most authoritative, then the
 * project id / display name. Token matching (shared classifier) means
 * "product"/"developer" do NOT match "prod"/"dev" and separator style
 * (`-`/`_`/`.`) doesn't matter.
 */
export function classifyProjectEnv(project: GcpProject): string | null {
  return classifyEnvironment([...envTagValues(project.labels), project.projectId, project.name]);
}

/** The user-selected project scope (`project_ids` variable), trimmed. */
function selectedProjectIds(ctx: CheckContext): string[] {
  const selected = ctx.variables.project_ids;
  if (!Array.isArray(selected)) return [];
  return selected
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Resolve the projects to evaluate, HONORING the `project_ids` opt-in scope:
 * when projects are selected we fetch exactly those (no truncation possible);
 * otherwise we discover all active projects with a bounded page walk and report
 * `truncated` so a partial footprint is never presented as a complete verdict.
 */
async function resolveProjects(ctx: CheckContext): Promise<ResolvedProjects> {
  const selected = selectedProjectIds(ctx);

  if (selected.length > 0) {
    const projects: GcpProject[] = [];
    let readError: string | undefined;
    for (const id of selected) {
      try {
        const project = await ctx.fetch<GcpProject>(`/v1/projects/${encodeURIComponent(id)}`);
        if (project && typeof project.projectId === 'string') {
          projects.push(project);
        }
      } catch (err) {
        readError = toHttpReadFailure(err).error;
        ctx.log(`GCP env-separation: could not read project ${id} — ${readError}`);
      }
    }
    return { projects, truncated: false, readError };
  }

  const projects: GcpProject[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const data = await ctx.fetch<{
      projects?: GcpProject[];
      nextPageToken?: string;
    }>(
      `/v1/projects?filter=${encodeURIComponent('lifecycleState:ACTIVE')}&pageSize=100${tokenParam}`,
    );
    for (const p of data.projects ?? []) projects.push(p);
    pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
    pages++;
  } while (pageToken && pages < 20);

  return { projects, truncated: Boolean(pageToken) };
}

const GUIDANCE =
  'Separate production and non-production workloads into distinct GCP projects and label each with an `environment` label (e.g. environment=production, environment=staging). If you separate environments another way (e.g. VPCs or folders), upload a console screenshot or architecture diagram as evidence.';

/**
 * Separation of Environments check (heuristic). GCP's recommended pattern is a
 * separate project per environment, so this infers separation from the project
 * footprint: it classifies each in-scope project into an environment (by
 * `environment`/`env` label, else name/id token) and passes only when it can
 * confirm a PRODUCTION environment is separated from at least one
 * NON-PRODUCTION environment.
 *
 * It honors the `project_ids` opt-in scope, never presents a truncated
 * discovery as complete, and is evidence-first: when it cannot confirm
 * separation it emits actionable guidance (label projects, or upload a diagram)
 * rather than a silent pass.
 */
export const environmentSeparationCheck: IntegrationCheck = {
  id: 'gcp-environment-separation',
  name: 'Separation of environments — production isolated from non-production',
  description:
    'Verify production and non-production workloads are separated across distinct GCP projects.',
  service: 'iam',
  taskMapping: TASK_TEMPLATES.separationOfEnvironments,

  run: async (ctx: CheckContext) => {
    let resolved: ResolvedProjects;
    try {
      resolved = await resolveProjects(ctx);
    } catch (err) {
      const failure = toHttpReadFailure(err);
      ctx.fail({
        title: 'Could not verify environment separation',
        description: `GCP projects could not be listed (${failure.error}), so environment separation could not be evaluated.`,
        resourceType: 'gcp-environment-separation',
        resourceId: 'projects',
        severity: 'medium',
        remediation: remediationForReadFailure(
          failure,
          'Grant resourcemanager.projects.list (e.g. roles/viewer) to the connection, then re-run the check.',
        ),
        evidence: { readError: failure.error },
      });
      return;
    }

    const { projects, truncated, readError } = resolved;

    if (projects.length === 0) {
      // A read failure (scoped projects unreadable) is "could not verify"; a
      // genuinely empty footprint is "no projects".
      ctx.fail({
        title: readError ? 'Could not verify environment separation' : 'No GCP projects detected',
        description: readError
          ? `Selected GCP projects could not be read (${readError}), so environment separation could not be evaluated.`
          : 'No GCP projects were in scope, so environment separation could not be evaluated.',
        resourceType: 'gcp-environment-separation',
        resourceId: 'projects',
        severity: 'medium',
        remediation: readError
          ? `Grant resourcemanager.projects.get (e.g. roles/viewer) for the selected projects, then re-run. ${GUIDANCE}`
          : `Grant resourcemanager.projects.list to the connection (or select projects in the integration settings), then re-run. ${GUIDANCE}`,
        evidence: { projectCount: 0, ...(readError ? { readError } : {}) },
      });
      return;
    }

    const classified = projects.map((p) => ({
      projectId: p.projectId,
      environment: classifyProjectEnv(p),
    }));
    const detected = [
      ...new Set(classified.map((c) => c.environment).filter((e): e is string => e !== null)),
    ];
    const sample = classified.slice(0, 50).map((c) => ({
      projectId: c.projectId,
      environment: c.environment ?? 'unclassified',
    }));
    const unclassifiedProjectCount = classified.filter((c) => c.environment === null).length;

    const coverageGaps: string[] = [];
    if (truncated) {
      coverageGaps.push('project discovery hit the page cap, so not all projects were evaluated');
    }
    if (readError) {
      coverageGaps.push('some selected projects could not be read');
    }

    const separationDetected = confirmsEnvironmentSeparation(detected);
    if (coverageGaps.length === 0 && separationDetected) {
      ctx.pass({
        title: 'Environments separated across projects',
        description: `Detected production separated from non-production across ${projects.length} GCP project(s): ${detected.join(', ')}.`,
        resourceType: 'gcp-environment-separation',
        resourceId: 'projects',
        evidence: {
          detectedEnvironments: detected,
          projectCount: projects.length,
          projects: sample,
          unclassifiedProjectCount,
        },
      });
      return;
    }

    // Could not confirm. Surface any incomplete coverage so a partial footprint
    // is never presented as a complete "not separated" verdict.
    const unclassifiedDetail =
      unclassifiedProjectCount > 0
        ? `; ${unclassifiedProjectCount} project(s) were unclassified and need an environment label or environment token in the project name`
        : '';
    const base =
      detected.length === 0
        ? `No GCP project could be classified by environment across ${projects.length} project(s)`
        : separationDetected
          ? `Detected production separated from non-production in the scanned GCP projects (${detected.join(', ')}), but coverage is incomplete across ${projects.length} project(s)`
          : `Detected environment(s) ${detected.join(', ')}, but could not confirm a production environment separated from a non-production one across ${projects.length} project(s)`;
    ctx.fail({
      title:
        coverageGaps.length > 0
          ? 'Could not verify environment separation'
          : 'Could not confirm environment separation',
      description: `${base}${unclassifiedDetail}${coverageGaps.length ? ` (${coverageGaps.join('; ')})` : ''}.`,
      resourceType: 'gcp-environment-separation',
      resourceId: 'projects',
      severity: 'medium',
      remediation: GUIDANCE,
      evidence: {
        detectedEnvironments: detected,
        projectCount: projects.length,
        unclassifiedProjectCount,
        ...(truncated ? { discoveryTruncated: true } : {}),
        projects: sample,
      },
    });
  },
};
