/**
 * JSON Schema passed to the Firecrawl Agent `agent()` call for core vendor
 * research. Kept as a separate module so `firecrawl-agent-core.ts` stays
 * under the 300-line project limit.
 *
 * This is the Firecrawl-side schema used to shape the LLM output; runtime
 * validation of the parsed response happens in `agent-schema.ts`
 * (vendorRiskAssessmentAgentSchema) via Zod.
 */
export const firecrawlAgentJsonSchema = {
  type: 'object',
  properties: {
    risk_level: {
      type: 'string',
      description:
        'Overall vendor risk level: critical, high, medium, low, or very_low',
    },
    security_assessment: {
      type: 'string',
      description:
        'A detailed paragraph summarizing the vendor security posture, including strengths, weaknesses, and key findings',
    },
    last_researched_at: {
      type: 'string',
      description: 'ISO 8601 date of when this research was conducted',
    },
    certifications: {
      type: 'array',
      description:
        'All security and compliance certifications found on the vendor website',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description:
              'Certification name, e.g. SOC 2 Type II, ISO 27001, FedRAMP, HIPAA, PCI DSS, GDPR, ISO 42001, ISO 27017, ISO 27018, TISAX, CSA STAR, C5, etc.',
          },
          status: {
            type: 'string',
            enum: ['verified', 'expired', 'not_certified', 'unknown'],
            description:
              'Whether the certification is currently active/verified, expired, not certified, or unknown',
          },
          issued_at: {
            type: 'string',
            description:
              'ISO 8601 date when the certification was issued, if mentioned',
          },
          expires_at: {
            type: 'string',
            description:
              'ISO 8601 date when the certification expires, if mentioned',
          },
          url: {
            type: 'string',
            description:
              'Direct URL to the certification report or trust page on the vendor domain',
          },
        },
        required: ['type'],
      },
    },
    links: {
      type: 'object',
      description:
        'Direct URLs to key legal and security pages on the vendor domain',
      properties: {
        privacy_policy_url: {
          type: 'string',
          description: 'Direct URL to the privacy policy page',
        },
        terms_of_service_url: {
          type: 'string',
          description: 'Direct URL to the terms of service page',
        },
        trust_center_url: {
          type: 'string',
          description:
            'Direct URL to the trust portal where customers can review security posture and request reports. Prefer the dedicated trust portal (often on trust.page, safebase.io, vanta.com, or a trust. subdomain) over documentation pages.',
        },
        security_page_url: {
          type: 'string',
          description:
            'Direct URL to the security overview or security practices page',
        },
        soc2_report_url: {
          type: 'string',
          description: 'Direct URL to request or download the SOC 2 report',
        },
      },
    },
  },
  required: ['security_assessment'],
} as const;
