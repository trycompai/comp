/**
 * Shared Variables for JumpCloud Integration
 *
 * Variables that can be reused across multiple checks.
 */

import type { CheckVariable } from '../../types';

/**
 * Whether to include suspended users in the sync
 */
export const includeSuspendedVariable: CheckVariable = {
  id: 'include_suspended',
  label: 'Include suspended users',
  type: 'select',
  required: false,
  default: 'false',
  helpText: 'Include suspended users in the employee list',
  options: [
    { value: 'false', label: 'No - Active users only' },
    { value: 'true', label: 'Yes - Include suspended users' },
  ],
};

/**
 * Filter by department
 */
export const departmentFilterVariable: CheckVariable = {
  id: 'department_filter',
  label: 'Filter by department',
  type: 'text',
  required: false,
  placeholder: 'e.g., Engineering',
  helpText: 'Only include users from this department (leave empty for all)',
};
