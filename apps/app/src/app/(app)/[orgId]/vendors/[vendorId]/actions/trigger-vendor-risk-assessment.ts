'use server';

import { authActionClient } from '@/actions/safe-action';
import { normalizeWebsite } from '@/utils/normalize-website';
import { db, VendorStatus } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

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

    // Trigger the task directly via Trigger.dev SDK
    const handle = await tasks.trigger('vendor-risk-assessment-task', {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorWebsite: normalizedWebsite,
      organizationId: session.activeOrganizationId,
      createdByUserId: session.userId ?? null,
      withResearch: true,
    });

    await db.vendor.update({
      where: { id: vendor.id },
      data: { status: VendorStatus.in_progress },
    });

    return {
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    };
  });
