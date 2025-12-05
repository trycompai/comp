import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { LinearOrganizationResponse } from '../types';

export const ssoEnabledCheck: IntegrationCheck = {
  id: 'linear_sso_enabled',
  name: 'SSO/SAML Enabled',
  description: 'Verify that SAML SSO is enabled for the Linear organization',
  taskMapping: TASK_TEMPLATES['2fa'], // SSO is related to 2FA/MFA requirements
  defaultSeverity: 'high',
  variables: [],

  run: async (ctx) => {
    const query = `
      query {
        organization {
          id
          name
          urlKey
          samlEnabled
          scimEnabled
          allowedAuthServices
        }
      }
    `;

    const response = await ctx.graphql<LinearOrganizationResponse>(query);
    const org = response.organization;

    if (org.samlEnabled) {
      ctx.pass({
        title: `SAML SSO is enabled for ${org.name}`,
        description: 'Organization has SAML single sign-on configured.',
        resourceType: 'organization',
        resourceId: org.id,
        evidence: {
          organizationName: org.name,
          urlKey: org.urlKey,
          samlEnabled: org.samlEnabled,
          scimEnabled: org.scimEnabled,
          allowedAuthServices: org.allowedAuthServices,
        },
      });
    } else {
      ctx.fail({
        title: `SAML SSO is not enabled for ${org.name}`,
        description: 'Organization does not have SAML single sign-on configured.',
        resourceType: 'organization',
        resourceId: org.id,
        severity: 'high',
        remediation: `1. Go to Linear Settings > Organization > Security
2. Configure SAML SSO with your identity provider
3. Enable "Require SAML authentication"

Note: SAML SSO requires a Linear Business or Enterprise plan.`,
      });
    }
  },
};
