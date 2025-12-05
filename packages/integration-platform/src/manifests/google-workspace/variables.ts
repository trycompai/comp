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
