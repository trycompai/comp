import { z } from 'zod';

const ComplianceBadgeSchema = z.object({
  type: z.enum([
    'soc2',
    'iso27001',
    'iso42001',
    'gdpr',
    'hipaa',
    'pci_dss',
    'nen7510',
    'iso9001',
  ]),
  verified: z.boolean(),
});

export const UpdateVendorTrustSettingsSchema = z.object({
  logoUrl: z.string().url().max(2000).optional().nullable(),
  showOnTrustPortal: z.boolean().optional(),
  trustPortalOrder: z.number().int().min(0).optional().nullable(),
  complianceBadges: z.array(ComplianceBadgeSchema).optional().nullable(),
});

export type UpdateVendorTrustSettingsDto = z.infer<
  typeof UpdateVendorTrustSettingsSchema
>;

export type ComplianceBadge = z.infer<typeof ComplianceBadgeSchema>;
