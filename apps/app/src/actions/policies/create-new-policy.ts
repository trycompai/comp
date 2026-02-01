'use server';

import { db, Departments, Frequency, PolicyStatus, type Prisma } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { createPolicySchema } from '../schema';

export const createPolicyAction = authActionClient
  .inputSchema(createPolicySchema)
  .metadata({
    name: 'create-policy',
    track: {
      event: 'create-policy',
      description: 'Create New Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { title, description, controlIds } = parsedInput;
    const { activeOrganizationId } = ctx.session;
    const { user } = ctx;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    // Find member id in the organization
    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId: activeOrganizationId,
        deactivated: false,
      },
    });

    if (!member) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const initialContent = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ] as Prisma.InputJsonValue[];

      // Create the policy with version 1 in a transaction
      const policy = await db.$transaction(async (tx) => {
        // Create the policy first (without currentVersionId)
        const newPolicy = await tx.policy.create({
          data: {
            name: title,
            description,
            organizationId: activeOrganizationId,
            assigneeId: member.id,
            department: Departments.none,
            frequency: Frequency.monthly,
            status: PolicyStatus.draft,
            content: initialContent,
            draftContent: initialContent, // Sync with content to prevent false "unpublished changes" indicator
            ...(controlIds &&
              controlIds.length > 0 && {
                controls: {
                  connect: controlIds.map((id) => ({ id })),
                },
              }),
          },
        });

        // Create version 1 as a draft
        const version = await tx.policyVersion.create({
          data: {
            policyId: newPolicy.id,
            version: 1,
            content: initialContent,
            publishedById: member.id,
            changelog: 'Initial version',
          },
        });

        // Update policy to set currentVersionId
        const updatedPolicy = await tx.policy.update({
          where: { id: newPolicy.id },
          data: { currentVersionId: version.id },
        });

        return updatedPolicy;
      });

      revalidatePath(`/${activeOrganizationId}/policies`);
      revalidateTag('policies', 'max');

      return {
        success: true,
        policyId: policy.id,
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        error: 'Failed to create policy',
      };
    }
  });
