/**
 * Shared Variables for Aikido Integration
 *
 * These variables can be configured by users when setting up the integration.
 */

import type { CheckVariable } from '../../types';
import type { AikidoCodeRepository } from './types';

/**
 * Minimum severity level to fail checks on.
 * Issues below this threshold will pass.
 */
export const severityThresholdVariable: CheckVariable = {
  id: 'severity_threshold',
  label: 'Minimum severity to fail on',
  type: 'select',
  required: false,
  default: 'high',
  helpText: 'Issues below this severity will not cause the check to fail',
  options: [
    { value: 'low', label: 'Low (fail on all issues)' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High (recommended)' },
    { value: 'critical', label: 'Critical only' },
  ],
};

/**
 * Maximum number of open issues before failing the threshold check.
 */
export const issueThresholdVariable: CheckVariable = {
  id: 'issue_threshold',
  label: 'Maximum allowed open issues',
  type: 'number',
  required: false,
  default: 0,
  placeholder: '0',
  helpText: 'Check fails if total open issues exceeds this number (0 = no issues allowed)',
};

/**
 * Target repositories to monitor.
 * Dynamically fetches available repositories from Aikido.
 */
export const targetRepositoriesVariable: CheckVariable = {
  id: 'target_repositories',
  label: 'Repositories to monitor',
  type: 'multi-select',
  required: false,
  helpText: 'Leave empty to check all repositories',
  fetchOptions: async (ctx) => {
    const response = await ctx.fetch<{ repositories: AikidoCodeRepository[] }>(
      'repositories/code',
    );

    const repositories = response.repositories ?? [];

    return repositories.map((repo) => ({
      value: repo.id,
      label: `${repo.full_name} (${repo.provider})`,
    }));
  },
};

/**
 * Include snoozed issues in checks.
 */
export const includeSnoozedVariable: CheckVariable = {
  id: 'include_snoozed',
  label: 'Include snoozed issues',
  type: 'boolean',
  required: false,
  default: false,
  helpText: 'If enabled, snoozed issues will also be counted as open',
};
