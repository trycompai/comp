import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
} from '../../http-read-failure';

interface GcpProject {
  projectId: string;
  name?: string;
  labels?: Record<string, string>;
}

/**
 * Environment classification by token. Production is listed first so it wins
 * when a string could match more than one bucket. Tokens are matched with word
 * boundaries (so "product"/"developer" do NOT match "prod"/"dev").
 */
const ENV_PATTERNS: ReadonlyArray<{ env: string; re: RegExp }> = [
  { env: 'production', re: /\b(prod|production|prd|live)\b/i },
  { env: 'staging', re: /\b(staging|stage|stg|preprod|uat)\b/i },
  { env: 'development', re: /\b(dev|develop|development)\b/i },
  { env: 'test', re: /\b(test|testing|qa)\b/i },
  { env: 'sandbox', re: /\b(sandbox|sbx|demo)\b/i },
];

// Label keys that conventionally carry the environment, checked before falling
// back to the project name/id — an explicit label is more authoritative.
const ENV_LABEL_KEYS = ['environment', 'env', 'stage', 'tier'] as const;

/** Classify a project into an environment bucket, or null if undetermined. */
export function classifyProjectEnv(project: GcpProject): string | null {
  const labelValues = ENV_LABEL_KEYS.map((k) => project.labels?.[k]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  // Explicit env labels first, then the project id / display name.
  const haystacks = [...labelValues, project.projectId, project.name ?? ''];
  for (const haystack of haystacks) {
    for (const { env, re } of ENV_PATTERNS) {
      if (re.test(haystack)) return env;
    }
  }
  return null;
}

/** List every active project the connection can see (bounded pagination). */
async function listActiveProjects(ctx: CheckContext): Promise<GcpProject[]> {
  const projects: GcpProject[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const tokenParam = pageToken
      ? `&pageToken=${encodeURIComponent(pageToken)}`
      : '';
    const data = await ctx.fetch<{
      projects?: GcpProject[];
      nextPageToken?: string;
    }>(
      `/v1/projects?filter=${encodeURIComponent('lifecycleState:ACTIVE')}&pageSize=100${tokenParam}`,
    );
    for (const p of data.projects ?? []) projects.push(p);
    pageToken =
      typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
    pages++;
  } while (pageToken && pages < 20);
  if (pageToken) {
    ctx.warn(
      'GCP project discovery hit the page cap; some projects may not be evaluated for environment separation',
      { pages, discovered: projects.length },
    );
  }
  return projects;
}

/**
 * Separation of Environments check (heuristic). GCP's recommended pattern is a
 * separate project per environment, so this infers separation from the project
 * footprint: it classifies each accessible project into an environment (by
 * `environment`/`env` label, else name/id token) and passes when TWO OR MORE
 * distinct environments are present.
 *
 * It is intentionally evidence-first, not a hard gate: separation is an
 * architectural property with no single API field, so when it cannot confirm
 * separation it emits actionable guidance (label projects, or upload a diagram)
 * rather than a silent pass. It evaluates ALL accessible projects regardless of
 * the `project_ids` scoping variable, since separation is about the whole
 * footprint.
 */
export const environmentSeparationCheck: IntegrationCheck = {
  id: 'gcp-environment-separation',
  name: 'Separation of environments — production isolated from non-production',
  description:
    'Verify production and non-production workloads are separated across distinct GCP projects.',
  service: 'iam',
  taskMapping: TASK_TEMPLATES.separationOfEnvironments,

  run: async (ctx: CheckContext) => {
    let projects: GcpProject[];
    try {
      projects = await listActiveProjects(ctx);
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

    if (projects.length === 0) {
      ctx.fail({
        title: 'No GCP projects detected',
        description:
          'No active GCP projects were accessible, so environment separation could not be evaluated.',
        resourceType: 'gcp-environment-separation',
        resourceId: 'projects',
        severity: 'medium',
        remediation:
          'Grant resourcemanager.projects.list to the connection (or select projects in the integration settings), then re-run — or upload a console screenshot / architecture diagram as evidence of environment separation.',
        evidence: { projectCount: 0 },
      });
      return;
    }

    const classified = projects.map((p) => ({
      projectId: p.projectId,
      environment: classifyProjectEnv(p),
    }));
    const detected = [
      ...new Set(
        classified
          .map((c) => c.environment)
          .filter((e): e is string => e !== null),
      ),
    ];

    if (detected.length >= 2) {
      ctx.pass({
        title: 'Environments separated across projects',
        description: `Detected ${detected.length} distinct environments across ${projects.length} GCP project(s): ${detected.join(', ')}.`,
        resourceType: 'gcp-environment-separation',
        resourceId: 'projects',
        evidence: {
          detectedEnvironments: detected,
          projectCount: projects.length,
          projects: classified
            .slice(0, 50)
            .map((c) => ({
              projectId: c.projectId,
              environment: c.environment ?? 'unclassified',
            })),
        },
      });
      return;
    }

    ctx.fail({
      title: 'Could not confirm environment separation',
      description:
        detected.length === 1
          ? `Only one environment ("${detected[0]}") was detected across ${projects.length} project(s); production and non-production do not appear to be separated into distinct projects.`
          : `No GCP project could be classified by environment across ${projects.length} project(s), so environment separation could not be confirmed.`,
      resourceType: 'gcp-environment-separation',
      resourceId: 'projects',
      severity: 'medium',
      remediation:
        'Separate production and non-production workloads into distinct GCP projects and label each with an `environment` label (e.g. environment=production, environment=staging). If you separate environments another way (e.g. VPCs or folders), upload a console screenshot or architecture diagram as evidence.',
      evidence: {
        detectedEnvironments: detected,
        projectCount: projects.length,
        projects: classified
          .slice(0, 50)
          .map((c) => ({
            projectId: c.projectId,
            environment: c.environment ?? 'unclassified',
          })),
      },
    });
  },
};
