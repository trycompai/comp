'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@db';
import type { Prisma } from '@db';
import { authActionClient } from '../safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { CopyObjectCommand } from '@aws-sdk/client-s3';

const VERSION_CREATE_RETRIES = 3;

const createVersionSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  changelog: z.string().optional(),
  entityId: z.string(),
});

async function copyPolicyVersionPdf(
  sourceKey: string,
  destinationKey: string,
): Promise<string | null> {
  if (!s3Client || !BUCKET_NAME) {
    return null;
  }
  try {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
      }),
    );
    return destinationKey;
  } catch (error) {
    console.error('Error copying policy PDF:', error);
    return null;
  }
}

export const createVersionAction = authActionClient
  .inputSchema(createVersionSchema)
  .metadata({
    name: 'create-policy-version',
    track: {
      event: 'create-policy-version',
      description: 'Created new policy version draft',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, changelog } = parsedInput;
    const { activeOrganizationId, userId } = ctx.session;

    if (!activeOrganizationId) {
      return { success: false, error: 'Not authorized' };
    }

    // Get member ID for publishedById
    let memberId: string | null = null;
    if (userId) {
      const member = await db.member.findFirst({
        where: { userId, organizationId: activeOrganizationId, deactivated: false },
        select: { id: true },
      });
      memberId = member?.id ?? null;
    }

    // Get policy with current version
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId: activeOrganizationId },
      include: {
        currentVersion: true,
      },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    // Source version is the current (published) version
    const sourceVersion = policy.currentVersion;
    const contentForVersion = sourceVersion
      ? (sourceVersion.content as Prisma.InputJsonValue[])
      : (policy.content as Prisma.InputJsonValue[]);
    const sourcePdfUrl = sourceVersion?.pdfUrl ?? policy.pdfUrl;

    if (!contentForVersion || contentForVersion.length === 0) {
      return { success: false, error: 'No content to create version from' };
    }

    // Create version with retry logic for race conditions
    // S3 copy is done AFTER the transaction to prevent orphaned files on retry
    let createdVersion: { versionId: string; version: number } | null = null;

    for (let attempt = 1; attempt <= VERSION_CREATE_RETRIES; attempt++) {
      try {
        createdVersion = await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          // Create version WITHOUT PDF first (S3 copy happens after transaction)
          const newVersion = await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: contentForVersion,
              pdfUrl: null, // Will be updated after S3 copy
              publishedById: memberId,
              changelog: changelog ?? null,
            },
          });

          return {
            versionId: newVersion.id,
            version: nextVersion,
          };
        });

        // Transaction succeeded, break out of retry loop
        break;
      } catch (error) {
        // Check for unique constraint violation (P2002)
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === 'P2002' &&
          attempt < VERSION_CREATE_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!createdVersion) {
      return { success: false, error: 'Failed to create policy version after retries' };
    }

    // Now copy S3 file OUTSIDE the transaction (no orphaned files on retry)
    if (sourcePdfUrl) {
      try {
        const newS3Key = `${activeOrganizationId}/policies/${policyId}/v${createdVersion.version}-${Date.now()}.pdf`;
        const newPdfUrl = await copyPolicyVersionPdf(sourcePdfUrl, newS3Key);

        if (newPdfUrl) {
          // Update the version with the PDF URL
          await db.policyVersion.update({
            where: { id: createdVersion.versionId },
            data: { pdfUrl: newPdfUrl },
          });
        }
      } catch (error) {
        // Log but don't fail - version was created successfully, just without PDF
        console.error('Error copying PDF for new version:', error);
      }
    }

    revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);
    revalidatePath(`/${activeOrganizationId}/policies`);

    return {
      success: true,
      data: createdVersion,
    };
  });
