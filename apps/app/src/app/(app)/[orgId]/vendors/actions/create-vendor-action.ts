'use server';

import type { ActionResponse } from '@/types/actions';
import { auth } from '@/utils/auth';
import { db, type Vendor, VendorCategory, VendorStatus } from '@db';
import axios from 'axios';
import { createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';
};

const normalizeWebsite = (website: string | undefined): string | null => {
  if (!website || website.trim() === '') return null;

  const trimmed = website.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return null;
  }
};

const triggerRiskAssessmentIfMissing = async (params: {
  organizationId: string;
  vendor: Pick<Vendor, 'id' | 'name' | 'website'>;
}): Promise<void> => {
  const normalizedWebsite = normalizeWebsite(params.vendor.website ?? undefined);
  if (!normalizedWebsite) {
    console.log('[createVendorAction] Skip risk assessment trigger (no valid website)', {
      organizationId: params.organizationId,
      vendorId: params.vendor.id,
      vendorName: params.vendor.name,
      vendorWebsite: params.vendor.website ?? null,
    });
    return;
  }

  const globalVendor = await db.globalVendors.findUnique({
    where: { website: normalizedWebsite },
    select: { riskAssessmentData: true },
  });

  // Only trigger *research* when GlobalVendors is missing data.
  if (globalVendor?.riskAssessmentData) {
    console.log('[createVendorAction] Skip risk assessment trigger (GlobalVendors already has data)', {
      organizationId: params.organizationId,
      vendorId: params.vendor.id,
      vendorName: params.vendor.name,
      normalizedWebsite,
    });
    return;
  }

  const token = process.env.INTERNAL_API_TOKEN;

  console.log('[createVendorAction] Trigger risk assessment research (GlobalVendors missing data)', {
    organizationId: params.organizationId,
    vendorId: params.vendor.id,
    vendorName: params.vendor.name,
    normalizedWebsite,
    hasInternalToken: Boolean(token),
  });

  await axios.post(
    `${getApiBaseUrl()}/v1/internal/vendors/risk-assessment/trigger-batch`,
    {
      organizationId: params.organizationId,
      withResearch: true,
      vendors: [
        {
          vendorId: params.vendor.id,
          vendorName: params.vendor.name,
          vendorWebsite: normalizedWebsite,
        },
      ],
    },
    {
      headers: token ? { 'X-Internal-Token': token } : undefined,
      timeout: 15_000,
    },
  );
};

const schema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  name: z.string().min(1, 'Name is required'),
  // Treat empty string as "not provided" so the form default doesn't block submission
  website: z
    .union([z.string().url('Must be a valid URL (include https://)'), z.literal('')])
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  description: z.string().optional(),
  category: z.nativeEnum(VendorCategory),
  status: z.nativeEnum(VendorStatus).default(VendorStatus.not_assessed),
  assigneeId: z.string().optional(),
});

export const createVendorAction = createSafeActionClient()
  .inputSchema(schema)
  .action(async (input): Promise<ActionResponse<Vendor>> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      // Security: verify the current user is a member of the target organization.
      // We intentionally do NOT rely on session.activeOrganizationId because it can be stale.
      const member = await db.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: input.parsedInput.organizationId,
          deactivated: false,
        },
        select: { id: true },
      });

      if (!member) {
        throw new Error('Unauthorized');
      }

      const vendor = await db.vendor.create({
        data: {
          name: input.parsedInput.name,
          description: input.parsedInput.description || '',
          category: input.parsedInput.category,
          status: input.parsedInput.status,
          assigneeId: input.parsedInput.assigneeId,
          website: input.parsedInput.website,
          organizationId: input.parsedInput.organizationId,
        },
      });

      // If we don't already have GlobalVendors risk assessment data for this website, trigger research.
      // Best-effort: vendor creation should succeed even if the trigger fails.
      try {
        await triggerRiskAssessmentIfMissing({
          organizationId: input.parsedInput.organizationId,
          vendor,
        });
      } catch (error) {
        console.warn('[createVendorAction] Risk assessment trigger failed (non-blocking)', {
          organizationId: input.parsedInput.organizationId,
          vendorId: vendor.id,
          vendorName: vendor.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      revalidatePath(`/${input.parsedInput.organizationId}/vendors`);

      return { success: true, data: vendor };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vendor',
      };
    }
  });
