import Firecrawl from '@mendable/firecrawl-js';
import { websiteExtractSchema, type WebsiteExtractData } from './types';

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (
    !/^https?:\/\//i.test(candidate) &&
    /^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(candidate)
  ) {
    candidate = `https://${candidate}`;
  }

  try {
    const urlObj = new URL(candidate);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return null;
    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Extract website compliance data (policies + contact info) via the Firecrawl
 * Agent SDK. Returns a single structured response — no polling required.
 */
export async function firecrawlExtractWebsiteData(
  website: string,
  log?: (msg: string, data?: Record<string, unknown>) => void,
): Promise<WebsiteExtractData | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    log?.('FIRECRAWL_API_KEY is not configured; skipping website extraction');
    return null;
  }

  let origin: string;
  try {
    origin = new URL(website).origin;
  } catch {
    log?.('Invalid website URL provided to Firecrawl', { website });
    return null;
  }

  const client = new Firecrawl({ apiKey });

  const prompt = `Examine the website at ${website} for compliance evidence.

Crawl the site thoroughly — check the footer, header, navigation, and pages under /legal/, /policies/, /about/, /company/.

Find the EXACT URLs for each of the following by following links on the site:

1. **Privacy Policy** — the dedicated page with the full privacy policy text.
   Common locations: /privacy, /privacy-policy, /legal/privacy, /legal/privacy-policy, /policies/privacy.
   Look for footer links labeled "Privacy" or "Privacy Policy".

2. **Terms of Service** — the dedicated page with the full terms text.
   Common locations: /terms, /terms-of-service, /tos, /legal/terms, /legal/terms-of-service.
   Look for footer links labeled "Terms", "Terms of Service", "Terms of Use".

3. **Data deletion** — does the privacy policy mention data deletion requests, right to erasure, or provide a form/email to request deletion?

4. **Contact page** — a page where customers can reach support or file complaints.
   Common locations: /contact, /contact-us, /support, /help.

5. **Contact email** — a customer-facing email visible on the site (footer, contact page, privacy policy, etc.).

6. **Contact form** — does a contact or support form exist on the site?

7. **Services description** — a 1-2 sentence summary of what the company offers.

Return absolute HTTPS URLs. Return empty strings for URLs not found and false for booleans not confirmed.`;

  try {
    const response = await client.agent({
      prompt,
      urls: [origin],
      schema: {
        type: 'object',
        properties: {
          privacy_policy_url: {
            type: 'string',
            description:
              'Absolute URL to the privacy policy page. Empty string if not found.',
          },
          terms_of_service_url: {
            type: 'string',
            description:
              'Absolute URL to the terms of service page. Empty string if not found.',
          },
          data_deletion_form_present: {
            type: 'boolean',
            description:
              'Whether the privacy policy mentions data deletion requests or right to erasure.',
          },
          contact_page_url: {
            type: 'string',
            description:
              'Absolute URL to a contact/support page. Empty string if not found.',
          },
          contact_email: {
            type: 'string',
            description:
              'Customer-facing contact email visible on the site. Empty string if not found.',
          },
          contact_form_present: {
            type: 'boolean',
            description:
              'Whether a contact or support form exists on the site.',
          },
          services_description: {
            type: 'string',
            description:
              'Brief 1-2 sentence description of the company services/products.',
          },
        },
        required: [
          'privacy_policy_url',
          'terms_of_service_url',
          'data_deletion_form_present',
          'contact_page_url',
          'contact_email',
          'contact_form_present',
        ],
      },
    });

    log?.('Firecrawl agent response received', {
      dataType: typeof response.data,
      keys:
        response.data && typeof response.data === 'object'
          ? Object.keys(response.data as Record<string, unknown>)
          : [],
    });

    const parsed = websiteExtractSchema.safeParse(response.data);
    if (!parsed.success) {
      log?.('Firecrawl agent returned invalid data shape', {
        issues: parsed.error.issues as unknown as Record<string, unknown>,
        rawData: JSON.stringify(response.data).slice(0, 500),
      });
      return null;
    }

    const result = {
      ...parsed.data,
      privacy_policy_url: normalizeUrl(parsed.data.privacy_policy_url),
      terms_of_service_url: normalizeUrl(parsed.data.terms_of_service_url),
      contact_page_url: normalizeUrl(parsed.data.contact_page_url),
    };

    log?.('Firecrawl extraction complete', {
      privacy_policy_url: result.privacy_policy_url ?? 'not found',
      terms_of_service_url: result.terms_of_service_url ?? 'not found',
      contact_page_url: result.contact_page_url ?? 'not found',
      contact_email: result.contact_email ?? 'not found',
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log?.('Firecrawl agent call failed', { error: message });
    return null;
  }
}
