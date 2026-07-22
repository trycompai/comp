import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db, Prisma, PolicyStatus } from '@db';
import type {
  FrameworkEditorFramework,
  FrameworkEditorPolicyTemplate,
  Policy,
} from '@db';
import { logger } from '@trigger.dev/sdk';
import { processTemplate } from './process-policy-template';
import { refineCueLines } from './refine-cue-lines';

export type OrganizationData = {
  id: string;
  name: string | null;
  website: string | null;
};

export type UpdatePolicyParams = {
  organizationId: string;
  policyId: string;
  contextHub: string;
  frameworks: FrameworkEditorFramework[];
  memberId?: string;
};

export type PolicyUpdateResult = {
  policyId: string;
  contextHub: string;
  policyName: string;
  updatedContent: {
    type: 'document';
    content: Record<string, unknown>[];
  };
};

export async function fetchOrganizationAndPolicy(
  organizationId: string,
  policyId: string,
): Promise<{
  organization: OrganizationData;
  policy: Policy;
  policyTemplate: FrameworkEditorPolicyTemplate;
}> {
  const [organization, policy] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, website: true },
    }),
    db.policy.findUnique({
      where: { id: policyId, organizationId },
    }),
  ]);

  if (!organization)
    throw new Error(`Organization not found for ${organizationId}`);
  if (!policy) throw new Error(`Policy not found for ${policyId}`);
  if (!policy.policyTemplateId)
    throw new Error(`Policy template not found for ${policyId}`);

  const policyTemplate = await db.frameworkEditorPolicyTemplate.findUnique({
    where: { id: policy.policyTemplateId },
  });

  if (!policyTemplate)
    throw new Error(`Policy template not found for ${policy.policyTemplateId}`);

  return { organization, policy, policyTemplate };
}

// Mirror PoliciesService.versionCreateRetries: retry version creation on a
// unique-constraint race so two near-simultaneous regenerations don't collide
// on the [policyId, version] key.
const POLICY_VERSION_CREATE_RETRIES = 3;

/**
 * Best-effort removal of the PDF objects a draft regeneration detached
 * (pdfUrl stores the raw S3 key — same contract as the policies controller).
 * Runs AFTER the database transaction commits so a failed delete can never
 * roll back the content update; failures are logged with their keys so the
 * objects can be cleaned up later instead of orphaning silently.
 */
async function deleteDetachedPdfObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // Same APP_AWS_* configuration as the other trigger tasks (evidence export)
  // — but non-throwing: cleanup is best-effort and must never fail the
  // regeneration, so missing configuration is logged and skipped.
  const bucketName = process.env.APP_AWS_BUCKET_NAME;
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  if (!bucketName || !accessKeyId || !secretAccessKey) {
    logger.warn(
      `APP_AWS_* S3 configuration missing; skipped deleting detached policy PDFs: ${keys.join(', ')}`,
    );
    return;
  }
  const s3 = new S3Client({
    region: process.env.APP_AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    ...(process.env.APP_AWS_ENDPOINT
      ? { endpoint: process.env.APP_AWS_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  for (const key of keys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    } catch (error) {
      logger.warn(`Failed to delete detached policy PDF ${key}: ${error}`);
    }
  }
}

export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
  memberId?: string,
): Promise<void> {
  try {
    const policy = await db.policy.findUnique({
      where: { id: policyId },
      select: { id: true, status: true, currentVersionId: true },
    });

    if (!policy) throw new Error(`Policy not found: ${policyId}`);

    const versionContent = content as unknown as Prisma.InputJsonValue[];

    // A draft policy has never been published: there is no live, signed content
    // to protect. The editor renders the CURRENT version's content
    // (currentVersion.content, falling back to policy.content), so regeneration
    // must overwrite the draft's working content IN PLACE — mirroring how
    // PoliciesService.updateById persists draft content edits. Appending an
    // unattached version instead (the published path below) would leave
    // policy.content / currentVersionId pointing at the old text, so the user
    // regenerates but keeps seeing the stale draft (CS-766).
    //
    // A draft can be in PDF display mode (the user uploaded a PDF as its
    // content): displayFormat = 'PDF' with pdfUrl set on the policy and/or the
    // current version. Regeneration produces EDITOR content, so we must clear
    // those stale PDF references and switch displayFormat back to 'EDITOR' —
    // otherwise the page opens on the PDF tab and export/render (which use
    // currentVersion.pdfUrl ?? policy.pdfUrl) keep serving the old uploaded
    // document instead of the regenerated content (CS-766).
    if (policy.status === PolicyStatus.draft) {
      // The uploaded-PDF keys this regeneration detaches, captured INSIDE the
      // transaction under a row lock: a concurrent PDF upload (a plain UPDATE
      // on the policy row) blocks on the lock, so the captured keys are
      // exactly the values the updates below clear — nothing committed in
      // between can slip an untracked orphan past the cleanup. Deleted from
      // S3 only after the transaction commits.
      const detachedPdfKeys = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Policy" WHERE id = ${policyId} FOR UPDATE`;
        const current = await tx.policy.findUniqueOrThrow({
          where: { id: policyId },
          select: { pdfUrl: true, currentVersion: { select: { pdfUrl: true } } },
        });
        if (policy.currentVersionId) {
          await tx.policyVersion.update({
            where: { id: policy.currentVersionId },
            data: {
              content: versionContent,
              changelog: 'Regenerated policy content',
              pdfUrl: null,
            },
          });
        }
        await tx.policy.update({
          where: { id: policyId },
          data: {
            content: versionContent,
            draftContent: versionContent,
            pdfUrl: null,
            displayFormat: 'EDITOR',
          },
        });
        return [
          ...new Set(
            [current.pdfUrl, current.currentVersion?.pdfUrl].filter(
              (key): key is string => !!key,
            ),
          ),
        ];
      });
      await deleteDetachedPdfObjects(detachedPdfKeys);
      return;
    }

    // Published / needs_review: regeneration must NOT mutate the live policy.
    // This previously deleted every version (and its PDF) and overwrote
    // policy.content / currentVersionId while clearing signedBy — replacing the
    // live, signed policy with unreviewed AI content and wiping every signature
    // (CS-766). Instead, create a new DRAFT version holding the regenerated
    // content and leave the published content, currentVersionId, signatures, PDF
    // and existing versions untouched. The draft is reviewed through the normal
    // version workflow; only publishing it (which clears signedBy) re-triggers
    // signing.
    for (
      let attempt = 1;
      attempt <= POLICY_VERSION_CREATE_RETRIES;
      attempt += 1
    ) {
      try {
        await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: versionContent,
              publishedById: memberId || null,
              changelog: 'Regenerated policy content',
            },
          });
        });
        return;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < POLICY_VERSION_CREATE_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }
  } catch (dbError) {
    logger.error(`Failed to update policy in database: ${dbError}`);
    throw dbError;
  }
}

export async function processPolicyUpdate(
  params: UpdatePolicyParams,
): Promise<PolicyUpdateResult> {
  const { organizationId, policyId, contextHub, frameworks, memberId } = params;

  const { organization, policyTemplate } = await fetchOrganizationAndPolicy(
    organizationId,
    policyId,
  );

  // Deterministic template processing: fill {{PLACEHOLDER}} values and evaluate
  // {{#if framework}} blocks from the org's real context. Mirrors the
  // bulk/onboarding path and replaces the slow, generic gpt-5-mini
  // full-document generator that ignored the template and produced
  // template-ish output.
  const processedContent = processTemplate({
    content: policyTemplate.content,
    companyName: organization.name ?? 'Company',
    contextHub,
    frameworks,
  });

  // Only fires when the template carries instruction cue lines ("State
  // that...", "Define..."); most policies skip it. Falls back to the
  // deterministic content if the targeted LLM rewrite fails.
  const refinedContent = await refineCueLines(
    processedContent,
    policyTemplate.name,
  );
  const updatedContent = {
    type: 'document' as const,
    content: refinedContent,
  };

  await updatePolicyInDatabase(policyId, updatedContent.content, memberId);

  return {
    policyId,
    contextHub,
    updatedContent,
    policyName: policyTemplate.name,
  };
}
