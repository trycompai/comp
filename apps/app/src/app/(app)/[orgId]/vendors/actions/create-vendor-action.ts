'use server';

import type { ActionResponse } from '@/types/actions';
import { auth } from '@/utils/auth';
import { extractDomain, normalizeWebsite } from '@/utils/normalize-website';
import { db, type Vendor, VendorCategory, VendorStatus } from '@db/server';
import axios from 'axios';
import { createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';
};

const triggerRiskAssessmentIfMissing = async (params: {
  organizationId: string;
  vendor: Pick<Vendor, 'id' | 'name' | 'website'>;
}): Promise<boolean> => {
  const normalizedWebsite = normalizeWebsite(params.vendor.website ?? null);
  if (!normalizedWebsite) {
    console.log('[createVendorAction] Skip risk assessment trigger (no valid website)', {
      organizationId: params.organizationId,
      vendorId: params.vendor.id,
      vendorName: params.vendor.name,
      vendorWebsite: params.vendor.website ?? null,
    });
    return false;
  }

  // Check if GlobalVendors already has risk assessment data for this domain
  // Find ALL duplicates and check if ANY has risk assessment data
  const domain = extractDomain(params.vendor.website ?? null);
  let existing = null;
  if (domain) {
    const duplicates = await db.globalVendors.findMany({
      where: {
        website: {
          contains: domain,
        },
      },
      select: { website: true, riskAssessmentData: true },
      orderBy: [{ riskAssessmentUpdatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Prefer record WITH risk assessment data
    existing = duplicates.find((gv) => gv.riskAssessmentData !== null) ?? duplicates[0] ?? null;
  }
  const existingHasData = Boolean(existing?.riskAssessmentData);

  // Only trigger *research* when GlobalVendors is missing data.
  if (existingHasData) {
    console.log(
      '[createVendorAction] Skip risk assessment trigger (GlobalVendors already has data)',
      {
        organizationId: params.organizationId,
        vendorId: params.vendor.id,
        vendorName: params.vendor.name,
        normalizedWebsite,
      },
    );
    return false;
  }

  const token = process.env.INTERNAL_API_TOKEN;

  console.log(
    '[createVendorAction] Trigger risk assessment research (GlobalVendors missing data)',
    {
      organizationId: params.organizationId,
      vendorId: params.vendor.id,
      vendorName: params.vendor.name,
      normalizedWebsite,
      hasInternalToken: Boolean(token),
    },
  );

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

  return true;
};

const schema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  name: z.string().trim().min(1, 'Name is required'),
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
        return {
          success: false,
          error: 'Unauthorized',
        };
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
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      // Check if vendor with same name already exists for this organization
      const existingVendor = await db.vendor.findFirst({
        where: {
          organizationId: input.parsedInput.organizationId,
          name: {
            equals: input.parsedInput.name,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
      });

      if (existingVendor) {
        return {
          success: false,
          error: `A vendor named "${existingVendor.name}" already exists in this organization.`,
        };
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

      // Create or update GlobalVendors entry immediately so vendor is searchable
      // This ensures the vendor appears in global vendor search suggestions right away
      const normalizedWebsite = normalizeWebsite(vendor.website ?? null);
      if (normalizedWebsite) {
        try {
          // Check if GlobalVendors entry already exists
          const existingGlobalVendor = await db.globalVendors.findUnique({
            where: { website: normalizedWebsite },
            select: { company_description: true },
          });

          const updateData: {
            company_name: string;
            company_description?: string | null;
          } = {
            company_name: vendor.name,
          };

          // Only update description if GlobalVendors doesn't have one yet
          if (!existingGlobalVendor?.company_description) {
            updateData.company_description = vendor.description || null;
          }

          await db.globalVendors.upsert({
            where: { website: normalizedWebsite },
            create: {
              website: normalizedWebsite,
              company_name: vendor.name,
              company_description: vendor.description || null,
              approved: false,
            },
            update: updateData,
          });
        } catch (error) {
          // Non-blocking: vendor creation succeeded, GlobalVendors upsert is optional
          console.warn('[createVendorAction] Failed to upsert GlobalVendors (non-blocking)', {
            organizationId: input.parsedInput.organizationId,
            vendorId: vendor.id,
            vendorName: vendor.name,
            normalizedWebsite,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // If we don't already have GlobalVendors risk assessment data for this website, trigger research.
      // Best-effort: vendor creation should succeed even if the trigger fails.
      let didTriggerRiskAssessment = false;
      try {
        didTriggerRiskAssessment = await triggerRiskAssessmentIfMissing({
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

      if (didTriggerRiskAssessment && vendor.status === VendorStatus.not_assessed) {
        await db.vendor.update({
          where: { id: vendor.id },
          data: { status: VendorStatus.in_progress },
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
