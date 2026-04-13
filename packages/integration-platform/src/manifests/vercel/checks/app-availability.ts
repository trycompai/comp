import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import type {
  VercelDeploymentsResponse,
  VercelProject,
  VercelProjectsResponse,
} from '../types';

/**
 * Vercel App Availability Check
 *
 * Verifies that Vercel projects have active, healthy deployments
 * indicating the applications are available and running.
 * Maps to: App Availability task
 */
export const appAvailabilityCheck: IntegrationCheck = {
  id: 'app-availability',
  name: 'App Availability',
  description: 'Verify Vercel projects have active, healthy deployments',
  taskMapping: TASK_TEMPLATES.appAvailability,
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Vercel App Availability check');

    const oauthMeta = (ctx.metadata?.oauth || {}) as {
      team?: { id?: string; name?: string };
      user?: { id?: string; username?: string };
    };
    const teamId = oauthMeta.team?.id;

    if (teamId) {
      ctx.log(`Operating in team context: ${teamId}`);
    }

    // Fetch projects
    let projects: VercelProject[] = [];
    try {
      const response = await ctx.fetch<VercelProjectsResponse>(
        teamId ? `/v9/projects?teamId=${teamId}` : '/v9/projects',
      );
      projects = response.projects || [];
      ctx.log(`Found ${projects.length} projects`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to fetch Vercel projects',
        resourceType: 'vercel',
        resourceId: 'projects',
        severity: 'high',
        description: `Could not fetch projects: ${msg}`,
        remediation: 'Ensure the OAuth connection has access to your projects.',
      });
      return;
    }

    if (projects.length === 0) {
      ctx.fail({
        title: 'No Vercel projects found',
        resourceType: 'vercel',
        resourceId: 'projects',
        severity: 'medium',
        description: 'No projects found in this account.',
        remediation: 'Verify the connection has access to your Vercel projects.',
      });
      return;
    }

    // Transient states where Vercel keeps the previous READY deployment serving traffic
    const transitionalStates = new Set(['BUILDING', 'QUEUED', 'INITIALIZING']);

    for (const project of projects.slice(0, 10)) {
      try {
        const params = new URLSearchParams({ projectId: project.id, limit: '1', target: 'production' });
        if (teamId) params.set('teamId', teamId);

        const response = await ctx.fetch<VercelDeploymentsResponse>(
          `/v6/deployments?${params.toString()}`,
        );
        const deployments = response.deployments || [];
        const latestDeploy = deployments[0];

        if (latestDeploy && latestDeploy.state === 'READY') {

          ctx.pass({
            title: `Available: ${project.name}`,
            resourceType: 'project',
            resourceId: project.id,
            description: `Latest production deployment is READY.`,
            evidence: {
              project: project.name,
              deploymentState: latestDeploy.state,
              deploymentUrl: latestDeploy.url,
              deployedAt: new Date(latestDeploy.created).toISOString(),
            },
          });
        } else if (latestDeploy && transitionalStates.has(latestDeploy.state)) {

          ctx.pass({
            title: `Deploying: ${project.name}`,
            resourceType: 'project',
            resourceId: project.id,
            description: `Deployment in progress (${latestDeploy.state}). Previous deployment continues serving traffic.`,
            evidence: {
              project: project.name,
              deploymentState: latestDeploy.state,
              deploymentUrl: latestDeploy.url,
            },
          });
        } else if (latestDeploy && latestDeploy.state === 'CANCELED') {
          ctx.fail({
            title: `Canceled deployment: ${project.name}`,
            resourceType: 'project',
            resourceId: project.id,
            severity: 'medium',
            description: `Latest production deployment was canceled. Previous deployment may still be serving traffic.`,
            remediation: `Review canceled deployment and redeploy via Vercel Dashboard > ${project.name} > Deployments.`,
          });
        } else if (latestDeploy) {
          ctx.fail({
            title: `Unhealthy: ${project.name}`,
            resourceType: 'project',
            resourceId: project.id,
            severity: 'high',
            description: `Latest production deployment state: ${latestDeploy.state}.`,
            remediation: `Check deployment status in Vercel Dashboard > ${project.name} > Deployments.`,
            evidence: {
              project: project.name,
              deploymentState: latestDeploy.state,
              deploymentUrl: latestDeploy.url,
            },
          });
        } else {

          ctx.fail({
            title: `No production deployment: ${project.name}`,
            resourceType: 'project',
            resourceId: project.id,
            severity: 'medium',
            description: 'No production deployments found for this project.',
            remediation: `Deploy to production via Vercel Dashboard or CLI.`,
          });
        }
      } catch (error) {
        ctx.fail({
          title: `Failed to check: ${project.name}`,
          resourceType: 'project',
          resourceId: project.id,
          severity: 'medium',
          description: `Could not fetch deployments: ${error instanceof Error ? error.message : String(error)}`,
          remediation: 'Verify the OAuth connection has access to this project.',
        });
      }
    }

    ctx.log('Vercel App Availability check complete');
  },
};
