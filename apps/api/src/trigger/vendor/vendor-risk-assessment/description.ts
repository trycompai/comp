import type { OrgFramework } from './frameworks';
import type { FirecrawlVendorData } from './schema';

export function buildRiskAssessmentDescription(params: {
  vendorName: string;
  vendorWebsite: string | null;
  research: FirecrawlVendorData | null;
  frameworkChecklist: string[];
  organizationFrameworks: OrgFramework[];
}): string {
  const { vendorName, vendorWebsite, research, frameworkChecklist, organizationFrameworks } =
    params;

  const instruction =
    'Conduct a risk assessment for this vendor. Review their controls and documentation against SOC 2 and ISO 27001 expectations and add a comment describing how your team will use the vendor securely.';

  const links: Array<{ label: string; url: string }> = [];
  if (research?.trust_portal_url)
    links.push({ label: 'Trust Center', url: research.trust_portal_url });
  if (research?.security_overview_url)
    links.push({ label: 'Security Overview', url: research.security_overview_url });
  if (research?.soc2_report_url)
    links.push({ label: 'SOC 2 Report', url: research.soc2_report_url });
  if (research?.privacy_policy_url)
    links.push({ label: 'Privacy Policy', url: research.privacy_policy_url });
  if (research?.terms_of_service_url)
    links.push({ label: 'Terms of Service', url: research.terms_of_service_url });

  const content: Array<Record<string, unknown>> = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: instruction }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Vendor:' },
        { type: 'text', text: ` ${vendorName}` },
      ],
    },
  ];

  if (vendorWebsite) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Website:' },
        { type: 'text', text: ` ${vendorWebsite}` },
      ],
    });
  }

  // Intentionally omit "Framework Focus" line to keep the description concise.

  if (frameworkChecklist.length > 0) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Framework-specific checks:' },
      ],
    });
    content.push({
      type: 'bulletList',
      content: frameworkChecklist.map((item) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
      })),
    });
  }

  if (research?.company_description) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Company Overview:' },
      ],
    });
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: research.company_description }],
    });
  }

  const certs = research?.certified_security_frameworks?.filter(Boolean) ?? [];
  if (certs.length > 0) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Security Certifications:' },
      ],
    });
    content.push({
      type: 'bulletList',
      content: certs.map((framework) => ({
        type: 'listItem',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: framework }] },
        ],
      })),
    });
  }

  if (links.length > 0) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Relevant Links:' },
      ],
    });
    content.push({
      type: 'bulletList',
      content: links.map((link) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: link.url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                  },
                ],
                text: link.label,
              },
            ],
          },
        ],
      })),
    });
  } else if (vendorWebsite) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: 'Note: Automated research did not return links. Please collect documentation manually.',
        },
      ],
    });
  } else {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: 'Note: No website provided for automated research.',
        },
      ],
    });
  }

  return JSON.stringify({ type: 'doc', content });
}


