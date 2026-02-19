import { z } from 'zod';

const optionalUrl = z
  .union([z.string().url(), z.literal('')])
  .optional()
  .nullable();

export const websiteExtractSchema = z.object({
  privacy_policy_url: optionalUrl,
  terms_of_service_url: optionalUrl,
  data_deletion_form_present: z.boolean().optional().nullable(),
  contact_page_url: optionalUrl,
  contact_email: z.string().optional().nullable(),
  contact_form_present: z.boolean().optional().nullable(),
  services_description: z.string().optional().nullable(),
});

export type WebsiteExtractData = z.infer<typeof websiteExtractSchema>;
