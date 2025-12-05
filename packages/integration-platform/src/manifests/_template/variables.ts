/**
 * Shared Variables for Your Integration
 *
 * Define variables that can be reused across multiple checks.
 * Variables allow users to configure how checks run.
 */

import type { CheckVariable } from '../../types';
import type { ExampleResource } from './types';

/**
 * Example: Variable for selecting which resources to monitor.
 * This dynamically fetches options from the API.
 */
export const targetResourcesVariable: CheckVariable = {
  id: 'target_resources',
  label: 'Resources to monitor',
  type: 'multi-select',
  required: false,
  helpText: 'Leave empty to check all resources',
  fetchOptions: async (ctx) => {
    // Fetch resources from the API
    const resources = await ctx.fetch<ExampleResource[]>('/resources');

    return resources.map((r) => ({
      value: r.id,
      label: `${r.name} (${r.status})`,
    }));
  },
};

/**
 * Example: Simple text variable
 */
export const thresholdVariable: CheckVariable = {
  id: 'threshold',
  label: 'Alert threshold',
  type: 'text',
  required: false,
  default: '10',
  placeholder: '10',
  helpText: 'Minimum number before alerting',
};
