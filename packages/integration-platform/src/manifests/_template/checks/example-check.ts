import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { ExampleResource } from '../types';
import { targetResourcesVariable } from '../variables';

export const exampleCheck: IntegrationCheck = {
  id: 'example_check',
  name: 'Example Security Check',
  description: 'Verify that resources have proper security configuration',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'medium',
  variables: [targetResourcesVariable],

  run: async (ctx) => {
    const targetResources = ctx.variables.target_resources as string[] | undefined;

    let resources: ExampleResource[];
    if (targetResources?.length) {
      resources = [];
      for (const id of targetResources) {
        try {
          resources.push(await ctx.fetch<ExampleResource>(`/resources/${id}`));
        } catch {
          ctx.warn(`Could not fetch resource ${id}`);
        }
      }
    } else {
      resources = await ctx.fetch<ExampleResource[]>('/resources');
    }

    ctx.log(`Checking ${resources.length} resources`);

    for (const resource of resources) {
      const isCompliant = resource.status === 'active';

      if (isCompliant) {
        ctx.pass({
          title: `${resource.name} is compliant`,
          description: 'Resource has correct security configuration.',
          resourceType: 'resource',
          resourceId: resource.id,
          evidence: { status: resource.status, raw: resource },
        });
      } else {
        ctx.fail({
          title: `${resource.name} is not compliant`,
          description: 'Resource lacks required security configuration.',
          resourceType: 'resource',
          resourceId: resource.id,
          severity: 'medium',
          remediation: '1. Go to resource settings\n2. Enable security feature\n3. Save',
        });
      }
    }
  },
};
