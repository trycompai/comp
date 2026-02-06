'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateVendorTrustSettingsSchema = z.object({
  vendorId: z.string(),
  logoUrl: z.string().url().max(2000).nullable().optional(),
  showOnTrustPortal: z.boolean().optional(),
  trustPortalOrder: z.number().int().min(0).nullable().optional(),
  // Note: complianceBadges are auto-populated from risk assessment, not manually editable
});

/**
 * Extract domain from a URL for use with Clearbit Logo API
 * Keeps subdomains as Clearbit supports branded subdomains (e.g., aws.amazon.com)
 */
function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Generate logo URL using Google Favicon API (free and reliable)
 * Returns a 128px favicon/logo for the domain
 */
function generateLogoUrl(website: string | null): string | null {
  const domain = extractDomain(website);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

export const updateVendorTrustSettingsAction = authActionClient
  .metadata({
    name: 'update-vendor-trust-settings',
    track: {
      event: 'update-vendor-trust-settings',
      channel: 'server',
    },
  })
  .inputSchema(updateVendorTrustSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const vendor = await db.vendor.findUnique({
      where: { id: parsedInput.vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.organizationId !== ctx.session.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    // Auto-generate logo URL if not explicitly provided and vendor has a website
    let logoUrl = parsedInput.logoUrl;
    if (logoUrl === undefined && vendor.website) {
      // Always regenerate from website to ensure we have the latest/correct URL
      logoUrl = generateLogoUrl(vendor.website);
    }

    const updated = await db.vendor.update({
      where: { id: parsedInput.vendorId },
      data: {
        logoUrl,
        showOnTrustPortal: parsedInput.showOnTrustPortal,
        trustPortalOrder: parsedInput.trustPortalOrder,
        // complianceBadges are auto-populated from risk assessment
      },
    });

    revalidatePath(`/${vendor.organizationId}/trust/portal-settings`);

    return updated;
  });
