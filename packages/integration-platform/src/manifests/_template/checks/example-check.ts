/**
 * Example Check
 * 
 * This is a template for creating a new check.
 * Each check should:
 * 1. Have a unique id
 * 2. Map to a task template for auto-completion
 * 3. Use ctx.pass() and ctx.fail() for structured output
 * 4. Provide detailed evidence for auditors
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { ExampleResource } from '../types';
import { targetResourcesVariable } from '../variables';

export const exampleCheck: IntegrationCheck = {
  id: 'example_check',
  name: 'Example Security Check',
  description: 'Verify that resources have proper security configuration',
  
  // Map to a task template - this enables auto-completion
  // See TASK_TEMPLATES for available mappings
  taskMapping: TASK_TEMPLATES.secureCode,
  
  // Default severity for findings
  defaultSeverity: 'medium',

  // Variables this check uses
  variables: [targetResourcesVariable],

  run: async (ctx) => {
    // Get user-configured variables
    const targetResources = ctx.variables.target_resources as string[] | undefined;

    ctx.log('Starting example check...');

    // Fetch resources from the API
    let resources: ExampleResource[];

    if (targetResources && targetResources.length > 0) {
      // Fetch specific resources
      resources = [];
      for (const resourceId of targetResources) {
        try {
          const resource = await ctx.fetch<ExampleResource>(`/resources/${resourceId}`);
          resources.push(resource);
        } catch {
          ctx.warn(`Could not fetch resource ${resourceId}`);
        }
      }
    } else {
      // Fetch all resources
      resources = await ctx.fetch<ExampleResource[]>('/resources');
    }

    ctx.log(`Checking ${resources.length} resources`);

    // Check each resource
    for (const resource of resources) {
      // Your check logic here
      const isCompliant = resource.status === 'active';

      if (isCompliant) {
        // Record a passing result with evidence
        ctx.pass({
          title: `Resource ${resource.name} is compliant`,
          description: 'This resource has the correct security configuration.',
          resourceType: 'resource',
          resourceId: resource.id,
          evidence: {
            status: resource.status,
            checked_at: new Date().toISOString(),
            // Include relevant API data as evidence
            raw_data: resource,
          },
        });
      } else {
        // Record a finding (failure)
        ctx.fail({
          title: `Resource ${resource.name} is not compliant`,
          description: 'This resource does not have the correct security configuration.',
          resourceType: 'resource',
          resourceId: resource.id,
          severity: 'medium',
          remediation: `1. Go to the resource settings\n2. Enable the security feature\n3. Save changes`,
        });
      }
    }
  },
};

