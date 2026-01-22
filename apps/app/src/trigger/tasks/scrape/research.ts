import { researchJobCore } from '@/trigger/lib/research';
import { db } from '@db';
import { schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';

const firecrawlDataSchema = z.object({
  company_name: z.string().optional().nullable(),
  legal_name: z.string().optional().nullable(),
  company_description: z.string().optional().nullable(),
  company_hq_address: z.string().optional().nullable(),
  privacy_policy_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  terms_of_service_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  service_level_agreement_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  security_overview_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  trust_portal_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  certified_security_frameworks: z.array(z.string()).optional().nullable(),
  subprocessors: z.array(z.string()).optional().nullable(),
  type_of_company: z.string().optional().nullable(),
});

export const researchVendor = schemaTask({
  id: 'research-vendor',
  schema: z.object({
    website: z.string().url(),
  }),
  maxDuration: 1000 * 60 * 10, // 10 minutes total task duration
  run: async (payload, { ctx }) => {
    // Check if vendor already exists
    const existingVendor = await db.globalVendors.findFirst({
      where: {
        OR: [
          { website: payload.website },
          {
            company_name: {
              equals: payload.website,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    if (existingVendor) {
      return {
        message: 'Vendor already exists in database',
        existingVendor,
      };
    }

    return researchJobCore({
      website: payload.website,
      prompt: "You're a cyber security researcher, researching a vendor.",
      schema: {
        type: 'object',
        properties: {
          company_name: { type: 'string' },
          legal_name: { type: 'string' },
          company_description: { type: 'string' },
          company_hq_address: { type: 'string' },
          privacy_policy_url: { type: 'string' },
          terms_of_service_url: { type: 'string' },
          service_level_agreement_url: { type: 'string' },
          security_overview_url: { type: 'string' },
          trust_portal_url: { type: 'string' },
          certified_security_frameworks: {
            type: 'array',
            items: { type: 'string' },
          },
          subprocessors: {
            type: 'array',
            items: { type: 'string' },
          },
          type_of_company: { type: 'string' },
        },
      },
      zodSchema: firecrawlDataSchema,
      dbSave: async (data) => {
        const security_certifications = data.certified_security_frameworks ?? [];
        const subprocessors = data.subprocessors ?? [];
        await db.globalVendors.upsert({
          where: {
            website: payload.website,
          },
          create: {
            company_name: data.company_name,
            website: payload.website,
            company_description: data.company_description,
            company_hq_address: data.company_hq_address,
            privacy_policy_url: data.privacy_policy_url,
            terms_of_service_url: data.terms_of_service_url,
            service_level_agreement_url: data.service_level_agreement_url,
            security_page_url: data.security_overview_url,
            trust_page_url: data.trust_portal_url,
            security_certifications,
            subprocessors,
            type_of_company: data.type_of_company,
            approved: false,
          },
          update: {
            company_name: data.company_name,
            website: payload.website,
            company_description: data.company_description,
            company_hq_address: data.company_hq_address,
            privacy_policy_url: data.privacy_policy_url,
            terms_of_service_url: data.terms_of_service_url,
            service_level_agreement_url: data.service_level_agreement_url,
            security_page_url: data.security_overview_url,
            trust_page_url: data.trust_portal_url,
          },
        });
      },
    });
  },
});
