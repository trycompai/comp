import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import { firecrawlExtractWebsiteData } from '../firecrawl';
import type { WebsiteExtractData } from '../types';

const FIRECRAWL_STATE_KEY = 'firecrawl_website_data';

export const contactInformationCheck: IntegrationCheck = {
  id: 'website_contact_information',
  name: 'Contact Information Available',
  description:
    'Verify that the organization website provides clear contact information for customers.',
  taskMapping: TASK_TEMPLATES.contactInformation,
  defaultSeverity: 'medium',

  run: async (ctx) => {
    const website = ctx.credentials.website as string | undefined;
    if (!website) {
      ctx.fail({
        title: 'No website configured',
        description:
          'Organization has no website URL set. Cannot check for contact information.',
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

    ctx.log(`Checking contact information for ${website}`);

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
          'Firecrawl extraction failed or API key not configured. Unable to verify contact information.',
        resourceType: 'website',
        resourceId: hostname,
        severity: 'medium',
        remediation:
          'Ensure FIRECRAWL_API_KEY is configured and the website is publicly accessible.',
      });
      return;
    }

    const hasContactPage = !!data.contact_page_url;
    const hasContactEmail = !!data.contact_email;
    const hasContactForm = !!data.contact_form_present;
    const hasAnyContact = hasContactPage || hasContactEmail || hasContactForm;

    const evidence = {
      contact_page_url: data.contact_page_url ?? null,
      contact_email: data.contact_email ?? null,
      contact_form_present: data.contact_form_present ?? false,
      services_description: data.services_description ?? null,
      checkedAt: new Date().toISOString(),
    };

    if (hasAnyContact) {
      const methods: string[] = [];
      if (hasContactPage) methods.push('contact page');
      if (hasContactEmail) methods.push(`email (${data.contact_email})`);
      if (hasContactForm) methods.push('contact form');

      ctx.pass({
        title: `Contact information found for ${hostname}`,
        description: `Customer contact methods available: ${methods.join(', ')}.${data.services_description ? ` Services: ${data.services_description}` : ''}`,
        resourceType: 'website',
        resourceId: hostname,
        evidence,
      });
    } else {
      ctx.fail({
        title: `No contact information found on ${hostname}`,
        description:
          'No contact page, email, or contact form was found on the website.',
        resourceType: 'website',
        resourceId: hostname,
        severity: 'medium',
        remediation:
          '1. Add a "Contact Us" page to your website with clear instructions for reaching support\n2. Display a contact email address visible to customers\n3. Consider adding a contact form for issue/complaint submission\n4. Ensure you are logging and tracking incoming customer requests',
        evidence,
      });
    }
  },
};
