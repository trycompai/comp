'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createCustomLinkSchema = z.object({
  orgId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  url: z.string().url().max(2000),
});

const updateCustomLinkSchema = z.object({
  linkId: z.string(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  url: z.string().url().max(2000).optional(),
  isActive: z.boolean().optional(),
});

const deleteCustomLinkSchema = z.object({
  linkId: z.string(),
});

const reorderCustomLinksSchema = z.object({
  orgId: z.string(),
  linkIds: z.array(z.string()),
});

export const createCustomLinkAction = authActionClient
  .metadata({
    name: 'create-custom-link',
    track: {
      event: 'create-custom-link',
      channel: 'server',
    },
  })
  .inputSchema(createCustomLinkSchema)
  .action(async ({ ctx, parsedInput }) => {
    const maxOrder = await db.trustCustomLink.findFirst({
      where: { organizationId: parsedInput.orgId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = (maxOrder?.order ?? -1) + 1;

    const link = await db.trustCustomLink.create({
      data: {
        organizationId: parsedInput.orgId,
        title: parsedInput.title,
        description: parsedInput.description,
        url: parsedInput.url,
        order,
      },
    });

    revalidatePath(`/${parsedInput.orgId}/trust/portal-settings`);

    return link;
  });

export const updateCustomLinkAction = authActionClient
  .metadata({
    name: 'update-custom-link',
    track: {
      event: 'update-custom-link',
      channel: 'server',
    },
  })
  .inputSchema(updateCustomLinkSchema)
  .action(async ({ ctx, parsedInput }) => {
    const link = await db.trustCustomLink.findUnique({
      where: { id: parsedInput.linkId },
      include: { organization: true },
    });

    if (!link) {
      throw new Error('Link not found');
    }

    const updated = await db.trustCustomLink.update({
      where: { id: parsedInput.linkId },
      data: {
        title: parsedInput.title,
        description: parsedInput.description,
        url: parsedInput.url,
        isActive: parsedInput.isActive,
      },
    });

    revalidatePath(`/${link.organizationId}/trust/portal-settings`);

    return updated;
  });

export const deleteCustomLinkAction = authActionClient
  .metadata({
    name: 'delete-custom-link',
    track: {
      event: 'delete-custom-link',
      channel: 'server',
    },
  })
  .inputSchema(deleteCustomLinkSchema)
  .action(async ({ ctx, parsedInput }) => {
    const link = await db.trustCustomLink.findUnique({
      where: { id: parsedInput.linkId },
      include: { organization: true },
    });

    if (!link) {
      throw new Error('Link not found');
    }

    await db.trustCustomLink.delete({
      where: { id: parsedInput.linkId },
    });

    revalidatePath(`/${link.organizationId}/trust/portal-settings`);

    return { success: true };
  });

export const reorderCustomLinksAction = authActionClient
  .metadata({
    name: 'reorder-custom-links',
    track: {
      event: 'reorder-custom-links',
      channel: 'server',
    },
  })
  .inputSchema(reorderCustomLinksSchema)
  .action(async ({ ctx, parsedInput }) => {
    await db.$transaction(
      parsedInput.linkIds.map((linkId: string, index: number) =>
        db.trustCustomLink.update({
          where: { id: linkId },
          data: { order: index },
        }),
      ),
    );

    revalidatePath(`/${parsedInput.orgId}/trust/portal-settings`);

    return { success: true };
  });
