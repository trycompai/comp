import type { TaskTemplateId } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { exchangePersonalAccessToken } from '../auth';
import { fetchFindingsPages, type FetchImpl } from '../client';
import { resolveRegion } from '../regions';
import type { CybeDefendFinding } from '../types';

/** CybeDefend severities, weakest first. */
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

type CybeDefendSeverity = (typeof SEVERITIES)[number];

const DEFAULT_THRESHOLD: CybeDefendSeverity = 'high';

/** Rank of an unreadable severity. Below every threshold, and never silent. */
const UNKNOWN_RANK = -1;

/**
 * Deliberately not "unknown falls back to the weakest level": that fold is how
 * findings with an empty severity once sat below every threshold, unreported.
 */
const rank = (severity: unknown): number =>
  typeof severity === 'string'
    ? SEVERITIES.indexOf(severity.trim().toLowerCase() as CybeDefendSeverity)
    : UNKNOWN_RANK;

const resolveThreshold = (value: unknown): CybeDefendSeverity =>
  typeof value === 'string' && SEVERITIES.includes(value.toLowerCase() as CybeDefendSeverity)
    ? (value.toLowerCase() as CybeDefendSeverity)
    : DEFAULT_THRESHOLD;

/** Highest severity present, used to grade the finding Comp AI records. */
const toCheckSeverity = (findings: CybeDefendFinding[]): FindingSeverity => {
  const highest = findings.reduce((worst, f) => Math.max(worst, rank(f.severity)), 0);
  return (SEVERITIES[highest] ?? 'low') as FindingSeverity;
};

type SeverityCounts = Record<CybeDefendSeverity | 'unknown', number>;

const countBySeverity = (findings: CybeDefendFinding[]): SeverityCounts => {
  const counts: SeverityCounts = { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 };
  for (const finding of findings) {
    const key = SEVERITIES[rank(finding.severity)];
    counts[key ?? 'unknown'] += 1;
  }
  return counts;
};

interface AccessibleProject {
  projectId: string;
  projectName: string;
  organizationId: string;
}

const readString = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

export interface ProjectFindingsCheckOptions {
  id: string;
  name: string;
  description: string;
  service: string;
  /** CybeDefend scan type this check reports on, e.g. `sast` or `sca`. */
  findingType: string;
  taskMapping?: TaskTemplateId;
  /** Injectable for tests. Defaults to the platform's own fetch. */
  fetchImpl?: FetchImpl;
}

/**
 * One result per project: it passes when no open finding of this scan type
 * reaches the configured severity. Clean projects come from the account's
 * project list, since a project with no findings never appears in the feed.
 *
 * The export has no scan-type filter, so each check narrows locally.
 */
export const createProjectFindingsCheck = ({
  id,
  name,
  description,
  service,
  findingType,
  taskMapping,
  fetchImpl,
}: ProjectFindingsCheckOptions): IntegrationCheck => ({
  id,
  name,
  description,
  service,
  taskMapping,
  defaultSeverity: 'high',

  variables: [
    {
      id: 'severity_threshold',
      label: 'Fail at or above severity',
      type: 'select',
      required: false,
      // Declaring it is what pre-selects the value in the form.
      default: DEFAULT_THRESHOLD,
      helpText: 'A project fails when it has an open finding at or above this severity.',
      options: [
        { value: 'critical', label: 'Critical only' },
        { value: 'high', label: 'High and above (default)' },
        { value: 'medium', label: 'Medium and above' },
        { value: 'low', label: 'Low and above' },
      ],
    },
  ],

  run: async (ctx: CheckContext) => {
    const region = readString(ctx.credentials.region);
    const organizationId = readString(ctx.credentials.organizationId);
    const personalAccessToken = readString(ctx.credentials.personalAccessToken);

    const tenant = readString(ctx.credentials.tenant);
    const { apiBaseUrl, logtoEndpoint, appBaseUrl } = resolveRegion({ region, tenant });

    ctx.log(
      `Querying CybeDefend region ${region} (${apiBaseUrl}) for organization ${organizationId}`,
    );

    const accessToken = await exchangePersonalAccessToken({
      apiBaseUrl,
      logtoEndpoint,
      personalAccessToken,
      fetchImpl,
    });
    ctx.log(`Exchanged the personal access token for a short-lived API token`);

    const projects = await listProjects({
      apiBaseUrl,
      organizationId,
      accessToken,
      fetchImpl,
    });
    ctx.log(`Found ${projects.length} project(s) visible to this token`);

    const { findings } = await fetchFindingsPages({
      apiBaseUrl,
      organizationId,
      accessToken,
      fetchImpl,
    });

    const relevant = findings.filter(
      (finding) => finding.finding_type?.toLowerCase() === findingType,
    );
    ctx.log(
      `Fetched ${findings.length} open finding(s), of which ${relevant.length} are ${findingType.toUpperCase()}`,
    );

    // Unrankable, so below every threshold. Surfaced rather than dropped.
    const unreadable = relevant.filter((finding) => rank(finding.severity) === UNKNOWN_RANK);
    if (unreadable.length > 0) {
      ctx.warn(
        `${unreadable.length} finding(s) with an unrecognised severity are counted but cannot breach the threshold`,
        { severities: [...new Set(unreadable.map((f) => f.severity))] },
      );
    }

    const byProject = new Map<string, CybeDefendFinding[]>();
    for (const finding of relevant) {
      const bucket = byProject.get(finding.project_id) ?? [];
      bucket.push(finding);
      byProject.set(finding.project_id, bucket);
    }

    const threshold = resolveThreshold(ctx.variables.severity_threshold);
    const thresholdRank = rank(threshold);

    // Union with the feed, so a project the token cannot enumerate is still reported.
    const projectNames = new Map(projects.map((p) => [p.projectId, p.projectName]));
    for (const finding of relevant) {
      if (!projectNames.has(finding.project_id)) {
        projectNames.set(finding.project_id, finding.project_name);
      }
    }

    let passedCount = 0;
    let failedCount = 0;

    for (const [projectId, projectName] of projectNames) {
      const projectFindings = byProject.get(projectId) ?? [];
      const breaching = projectFindings.filter((f) => rank(f.severity) >= thresholdRank);
      const counts = countBySeverity(projectFindings);
      const projectUrl = `${appBaseUrl}/project/${projectId}`;

      const evidence = {
        counts,
        total: projectFindings.length,
        scanType: findingType,
        threshold,
        projectName,
        projectUrl,
        checkedAt: new Date().toISOString(),
      };

      if (breaching.length === 0) {
        ctx.pass({
          title: `${projectName}: no ${findingType.toUpperCase()} findings at or above ${threshold}`,
          description: `${projectFindings.length} open ${findingType.toUpperCase()} finding(s), none at or above ${threshold}.`,
          resourceType: 'project',
          resourceId: projectId,
          evidence,
        });
        passedCount += 1;
        continue;
      }

      failedCount += 1;
      ctx.fail({
        title: `${projectName}: ${breaching.length} ${findingType.toUpperCase()} finding(s) at or above ${threshold}`,
        description: `CybeDefend reports ${breaching.length} open ${findingType.toUpperCase()} finding(s) at or above ${threshold} on this project's reference branch.`,
        resourceType: 'project',
        resourceId: projectId,
        severity: toCheckSeverity(breaching),
        remediation: `Open the ${projectName} project in CybeDefend and remediate its ${findingType.toUpperCase()} findings.`,
        evidence,
      });
    }

    ctx.log(
      `Reported ${projectNames.size} project(s) at threshold ${threshold}: ${failedCount} failed, ${passedCount} passed`,
    );
  },
});

/** Never fails the run: losing the clean projects beats reporting nothing. */
const listProjects = async ({
  apiBaseUrl,
  organizationId,
  accessToken,
  fetchImpl = globalThis.fetch as unknown as FetchImpl,
}: {
  apiBaseUrl: string;
  organizationId: string;
  accessToken: string;
  fetchImpl?: FetchImpl;
}): Promise<AccessibleProject[]> => {
  const response = await fetchImpl(`${apiBaseUrl}/user/profile`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { myAccessibleProjects?: AccessibleProject[] };
  const projects = Array.isArray(payload?.myAccessibleProjects) ? payload.myAccessibleProjects : [];

  return projects.filter((project) => project.organizationId === organizationId);
};
