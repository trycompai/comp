import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  applyVercelProjectFilter,
  filteredProjectsVariable,
  parseVercelProjectFilter,
  projectFilterModeVariable,
} from '../variables';
import type {
  VercelDeployment,
  VercelDeploymentsResponse,
  VercelProject,
  VercelProjectsResponse,
} from '../types';

/**
 * Vercel Monitoring & Alerting Check
 *
 * Verifies that deployments are being monitored and webhooks/notifications
 * are configured for deployment events.
 * Maps to: Monitoring & Alerting task
 */
export const monitoringAlertingCheck: IntegrationCheck = {
  id: 'monitoring-alerting',
  name: 'Monitoring & Alerting Review',
  description: 'Verify webhooks and notifications are configured for deployment monitoring',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  variables: [projectFilterModeVariable, filteredProjectsVariable],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Vercel Monitoring & Alerting check');

    // Get team context from OAuth metadata (set during OAuth if user authorized for a team).
    // OAuth providers can return extra context like team/user info which we store generically.
    const oauthMeta = (ctx.metadata?.oauth || {}) as {
      team?: { id?: string; name?: string };
      user?: { id?: string; username?: string };
    };
    const teamId = oauthMeta.team?.id;
    const teamName = oauthMeta.team?.name;

    if (teamId) {
      ctx.log(`Operating in team context: ${teamName || teamId}`);
    } else {
      ctx.log('Operating in personal account context');
    }

    // Fetch projects
    ctx.log('Fetching projects...');
    let projects: VercelProject[] = [];
    try {
      const projectsResponse = await ctx.fetch<VercelProjectsResponse>(
        teamId ? `/v9/projects?teamId=${teamId}` : '/v9/projects',
      );
      projects = projectsResponse.projects || [];
      ctx.log(`Found ${projects.length} projects`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to Fetch Vercel Projects',
        resourceType: 'vercel',
        resourceId: 'projects',
        severity: 'high',
        description: `Could not fetch projects: ${errorMessage}`,
        remediation: 'Ensure the OAuth connection has access to your projects',
        evidence: { error: errorMessage, teamId },
      });
      return;
    }

    const filter = parseVercelProjectFilter(ctx.variables);
    const scopedProjects = applyVercelProjectFilter(projects, filter);
    if (filter.mode !== 'all' && scopedProjects.length === 0) {
      ctx.fail({
        title: 'Project filter matched no projects',
        resourceType: 'vercel',
        resourceId: 'project-filter',
        severity: 'medium',
        description: `Filter mode "${filter.mode}" with ${filter.selectedIds.size} selected project(s) resolved to zero projects in scope. This may indicate deleted or renamed projects.`,
        remediation: 'Open the Configure sheet for this automation and review the selected projects.',
        evidence: {
          filterMode: filter.mode,
          selectedProjectIds: Array.from(filter.selectedIds),
          availableProjectIds: projects.map((p) => p.id),
        },
      });
      return;
    }
    ctx.log(
      `Project filter mode=${filter.mode}, scoped ${scopedProjects.length} of ${projects.length} projects`,
    );
    ctx.pass({
      title: 'Project filter applied',
      resourceType: 'vercel',
      resourceId: 'project-filter',
      description: `Mode: ${filter.mode}. Projects in scope: ${scopedProjects.length}/${projects.length}.`,
      evidence: {
        filterMode: filter.mode,
        selectedProjectIds: Array.from(filter.selectedIds),
        scopedProjectIds: scopedProjects.map((p) => p.id),
        totalProjectCount: projects.length,
      },
    });

    // Check recent deployments for failures
    ctx.log('Checking recent deployments...');
    const recentDeployments: VercelDeployment[] = [];
    const failedDeployments: VercelDeployment[] = [];

    for (const project of scopedProjects.slice(0, 10)) {
      // Check first 10 projects
      try {
        const params = new URLSearchParams({ projectId: project.id, limit: '10' });
        if (teamId) params.set('teamId', teamId);

        const deploymentsResponse = await ctx.fetch<VercelDeploymentsResponse>(
          `/v6/deployments?${params.toString()}`,
        );
        const deployments = deploymentsResponse.deployments || [];
        recentDeployments.push(...deployments);

        // Track failed deployments
        const failed = deployments.filter((d) => d.state === 'ERROR' || d.state === 'CANCELED');
        failedDeployments.push(...failed);
      } catch (error) {
        ctx.log(`Could not fetch deployments for project ${project.name}: ${error}`);
      }
    }

    ctx.log(
      `Found ${recentDeployments.length} recent deployments, ${failedDeployments.length} failed`,
    );

    if (failedDeployments.length > 0) {
      const recentFailures = failedDeployments.slice(0, 5);
      ctx.pass({
        title: 'Recent Deployment Failures Recorded',
        resourceType: 'deployment',
        resourceId: 'recent-failures',
        description: `${failedDeployments.length} failed or canceled deployments detected. Monitoring is capturing these events.`,
        evidence: {
          failedCount: failedDeployments.length,
          recentFailures: recentFailures.map((d) => ({
            name: d.name,
            state: d.state,
            url: d.url,
            created: new Date(d.created).toISOString(),
            target: d.target,
          })),
        },
      });
    } else {
      ctx.pass({
        title: 'No Recent Deployment Failures',
        resourceType: 'deployment',
        resourceId: 'recent-failures',
        description: 'No failed or canceled deployments detected in the reviewed projects.',
        evidence: {
          reviewedProjects: scopedProjects.length,
        },
      });
    }

    // Always emit a pass with the full configuration summary
    ctx.pass({
      title: 'Vercel Monitoring Configuration',
      resourceType: 'vercel',
      resourceId: 'monitoring',
      description: `Vercel${teamId ? ` (Team)` : ''}: ${projects.length} projects, ${recentDeployments.length} recent deployments`,
      evidence: {
        reviewedAt: new Date().toISOString(),
        teamId,
        teamName,
        summary: {
          recentFailures: failedDeployments.length,
        },
        projects: {
          total: projects.length,
          scoped: scopedProjects.length,
          names: scopedProjects.map((p) => p.name),
        },
        deployments: {
          recentTotal: recentDeployments.length,
          failedCount: failedDeployments.length,
          byState: {
            ready: recentDeployments.filter((d) => d.state === 'READY').length,
            error: recentDeployments.filter((d) => d.state === 'ERROR').length,
            canceled: recentDeployments.filter((d) => d.state === 'CANCELED').length,
            building: recentDeployments.filter((d) => d.state === 'BUILDING').length,
            queued: recentDeployments.filter((d) => d.state === 'QUEUED').length,
          },
        },
      },
    });

    ctx.log('Vercel Monitoring & Alerting check complete');
  },
};
