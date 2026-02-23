import type { CheckVariable } from '../../types';
import type { GoogleWorkspaceOrgUnitsResponse } from './types';

/**
 * Target organizational units to check
 * Allows filtering checks to specific OUs instead of entire domain
 */
export const targetOrgUnitsVariable: CheckVariable = {
  id: 'target_org_units',
  label: 'Organizational Units',
  helpText: 'Select which organizational units to include in checks (leave empty for all)',
  type: 'multi-select',
  required: false,
  fetchOptions: async (ctx) => {
    try {
      const response = await ctx.fetch<GoogleWorkspaceOrgUnitsResponse>(
        '/admin/directory/v1/customer/my_customer/orgunits?type=all',
      );

      if (!response.organizationUnits) {
        return [{ value: '/', label: '/ (Root)' }];
      }

      return response.organizationUnits.map((ou) => ({
        value: ou.orgUnitPath,
        label: `${ou.orgUnitPath} (${ou.name})`,
      }));
    } catch {
      return [{ value: '/', label: '/ (Root)' }];
    }
  },
};

/**
 * Whether to include suspended users in checks
 */
export const includeSuspendedVariable: CheckVariable = {
  id: 'include_suspended',
  label: 'Include Suspended Users',
  helpText: 'Include suspended users in security checks',
  type: 'select',
  required: false,
  default: 'false',
  options: [
    { value: 'false', label: 'No - Only active users' },
    { value: 'true', label: 'Yes - Include suspended users' },
  ],
};

/**
 * Employee sync filtering mode
 * Controls whether sync should include all users, exclude selected inboxes,
 * or include only selected inboxes.
 */
export const syncUserFilterModeVariable: CheckVariable = {
  id: 'sync_user_filter_mode',
  label: 'Employee Sync Filter Mode',
  helpText: 'Choose how Google Workspace users should be filtered during employee sync',
  type: 'select',
  required: false,
  default: 'all',
  options: [
    { value: 'all', label: 'All users' },
    { value: 'exclude', label: 'Exclude specific inboxes' },
    { value: 'include', label: 'Include only specific inboxes' },
  ],
};

/**
 * Comma/newline-separated list of inbox emails to exclude from employee sync.
 */
export const syncExcludedEmailsVariable: CheckVariable = {
  id: 'sync_excluded_emails',
  label: 'Exclude Inboxes (Emails)',
  helpText:
    'Used when filter mode is "Exclude specific inboxes". Enter comma/newline-separated full emails, domains (for example @company.com), or partial matches.',
  type: 'text',
  required: false,
  placeholder: 'support@company.com, @company.com, support@',
};

/**
 * Comma/newline-separated list of inbox emails to include in employee sync.
 */
export const syncIncludedEmailsVariable: CheckVariable = {
  id: 'sync_included_emails',
  label: 'Include Inboxes (Emails)',
  helpText:
    'Used when filter mode is "Include only specific inboxes". Enter comma/newline-separated full emails, domains (for example @company.com), or partial matches.',
  type: 'text',
  required: false,
  placeholder: 'alice@company.com, @company.com, support@',
};
