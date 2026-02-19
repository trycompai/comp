import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import { firecrawlExtractWebsiteData } from '../firecrawl';
import type { WebsiteExtractData } from '../types';

const FIRECRAWL_STATE_KEY = 'firecrawl_website_data';

export const publicPoliciesCheck: IntegrationCheck = {
  id: 'website_public_policies',
  name: 'Public Policies Published',
  description:
    'Verify that the organization website has a published privacy policy and terms of service.',
  taskMapping: TASK_TEMPLATES.publicPolicies,
  defaultSeverity: 'high',

  run: async (ctx) => {
    const website = ctx.credentials.website as string | undefined;
    if (!website) {
      ctx.fail({
        title: 'No website configured',
        description:
          'Organization has no website URL set. Cannot check for public policies.',
        resourceType: 'website',
        resourceId: 'unknown',
        severity: 'medium',
        remediation:
          'Set your organization website in Settings to enable this check.',
      });
      return;
    }

    let hostname: string;
    try {
      hostname = new URL(
        website.startsWith('http') ? website : `https://${website}`,
      ).hostname;
    } catch {
      hostname = website;
    }

    ctx.log(`Checking public policies for ${website}`);

    let data = await ctx.getState<WebsiteExtractData>(FIRECRAWL_STATE_KEY);
    if (!data) {
      ctx.log('No cached Firecrawl data, making extraction call');
      data = await firecrawlExtractWebsiteData(website, ctx.log);
      if (data) {
        await ctx.setState(FIRECRAWL_STATE_KEY, data);
      }
    } else {
      ctx.log('Using cached Firecrawl extraction data');
    }

    if (!data) {
      ctx.fail({
        title: `Could not analyze website for ${hostname}`,
        description:
          'Firecrawl extraction failed or API key not configured. Unable to verify policies.',
        resourceType: 'website',
        resourceId: hostname,
        severity: 'medium',
        remediation:
          'Ensure FIRECRAWL_API_KEY is configured and the website is publicly accessible.',
      });
      return;
    }

    const hasPrivacyPolicy = !!data.privacy_policy_url;
    const hasTermsOfService = !!data.terms_of_service_url;
    const evidence = {
      privacy_policy_url: data.privacy_policy_url ?? null,
      terms_of_service_url: data.terms_of_service_url ?? null,
      data_deletion_form_present: data.data_deletion_form_present ?? false,
      checkedAt: new Date().toISOString(),
    };

    if (hasPrivacyPolicy && hasTermsOfService) {
      ctx.pass({
        title: `Public policies found for ${hostname}`,
        description: `Privacy policy and terms of service are published.${data.data_deletion_form_present ? ' Data deletion request form detected.' : ''}`,
        resourceType: 'website',
        resourceId: hostname,
        evidence,
      });
    } else {
      const missing: string[] = [];
      if (!hasPrivacyPolicy) missing.push('Privacy Policy');
      if (!hasTermsOfService) missing.push('Terms of Service');

      ctx.fail({
        title: `Missing public policies on ${hostname}`,
        description: `The following required policies were not found: ${missing.join(', ')}.`,
        resourceType: 'website',
        resourceId: hostname,
        severity: 'high',
        remediation: `1. Create and publish the missing policies on your website: ${missing.join(', ')}\n2. Ensure they are linked in your website footer or legal pages\n3. For GDPR compliance, include a data deletion request mechanism in your privacy policy`,
        evidence,
      });
    }
  },
};
