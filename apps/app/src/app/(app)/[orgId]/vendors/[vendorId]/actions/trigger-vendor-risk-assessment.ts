'use server';

import { authActionClient } from '@/actions/safe-action';
import { normalizeWebsite } from '@/utils/normalize-website';
import { db, VendorStatus } from '@db';
import axios from 'axios';
import { z } from 'zod';

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';
};

export const triggerVendorRiskAssessmentAction = authActionClient
  .inputSchema(
    z.object({
      vendorId: z.string().min(1),
    }),
  )
  .metadata({
    name: 'trigger-vendor-risk-assessment',
    track: {
      event: 'trigger-vendor-risk-assessment',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { vendorId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const vendor = await db.vendor.findFirst({
      where: {
        id: vendorId,
        organizationId: session.activeOrganizationId,
      },
      select: {
        id: true,
        name: true,
        website: true,
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const normalizedWebsite = normalizeWebsite(vendor.website ?? null);
    if (!normalizedWebsite) {
      throw new Error('Vendor website is missing or invalid');
    }

    const token = process.env.INTERNAL_API_TOKEN;

    // Call the API endpoint which triggers the task and returns run info
    const response = await axios.post<{
      success: boolean;
      runId: string;
      publicAccessToken: string;
    }>(
      `${getApiBaseUrl()}/v1/internal/vendors/risk-assessment/trigger-single`,
      {
        organizationId: session.activeOrganizationId,
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorWebsite: normalizedWebsite,
        createdByUserId: session.userId ?? null,
      },
      {
        headers: token ? { 'X-Internal-Token': token } : undefined,
        timeout: 15_000,
      },
    );

    await db.vendor.update({
      where: { id: vendor.id },
      data: { status: VendorStatus.in_progress },
    });

    return {
      success: true,
      runId: response.data.runId,
      publicAccessToken: response.data.publicAccessToken,
    };
  });
