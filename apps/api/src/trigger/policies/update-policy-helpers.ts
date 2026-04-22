import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import type {
  FrameworkEditorFramework,
  FrameworkEditorPolicyTemplate,
  Policy,
  Prisma,
} from '@db';
import { logger } from '@trigger.dev/sdk';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { generatePrompt } from './update-policy-prompts';

// Sanitization utilities
const PLACEHOLDER_REGEX = /<<\s*TO\s*REVIEW\s*>>/gi;

function extractText(node: Record<string, unknown>): string {
  const text = node && typeof node['text'] === 'string' ? node['text'] : '';
  const content = Array.isArray((node as any)?.content)
    ? ((node as any).content as Record<string, unknown>[])
    : null;
  if (content && content.length > 0) {
    return content.map(extractText).join('');
  }
  return text || '';
}

function sanitizeNodePlaceholders(
  node: Record<string, unknown>,
): Record<string, unknown> {
  const cloned: Record<string, unknown> = { ...node };
  if (typeof cloned['text'] === 'string') {
    const replaced = cloned['text']
      .replace(PLACEHOLDER_REGEX, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    cloned['text'] = replaced;
  }
  const content = Array.isArray((cloned as any).content)
    ? ((cloned as any).content as Record<string, unknown>[])
    : null;
  if (content) {
    (cloned as any).content = content.map(sanitizeNodePlaceholders);
  }
  return cloned;
}

function shouldRemoveAuditorArtifactsHeading(headingText: string): boolean {
  const lower = headingText.trim().toLowerCase();
  return (
    lower.includes('auditor') &&
    (lower.includes('artefact') || lower.includes('artifact'))
  );
}

function removeAuditorArtifactsSection(
  content: Record<string, unknown>[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  let i = 0;
  while (i < content.length) {
    const node = content[i];
    const nodeType = typeof node['type'] === 'string' ? node['type'] : '';
    if (nodeType === 'heading') {
      const headingText = extractText(node);
      if (shouldRemoveAuditorArtifactsHeading(headingText)) {
        i += 1;
        while (i < content.length) {
          const nextNode = content[i];
          const nextType =
            typeof nextNode['type'] === 'string' ? nextNode['type'] : '';
          if (nextType === 'heading') break;
          i += 1;
        }
        continue;
      }
    }
    result.push(sanitizeNodePlaceholders(node));
    i += 1;
  }
  return result;
}

function extractHeadingText(node: Record<string, unknown>): string {
  const type = typeof node['type'] === 'string' ? node['type'] : '';
  if (type !== 'heading') return '';
  return extractText(node).trim();
}

function getAllowedTopLevelHeadings(
  originalContent: Record<string, unknown>[],
): string[] {
  const allowed: string[] = [];
  for (const node of originalContent) {
    const type = typeof node['type'] === 'string' ? node['type'] : '';
    if (type === 'heading') {
      const level = (node as any)?.attrs?.level;
      if (typeof level === 'number' && level >= 1 && level <= 2) {
        const text = extractHeadingText(node);
        if (text) allowed.push(text.toLowerCase());
      }
    }
  }
  return allowed;
}

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

export async function generatePolicyPrompt(
  policyTemplate: FrameworkEditorPolicyTemplate,
  contextHub: string,
  organization: OrganizationData,
  frameworks: FrameworkEditorFramework[],
): Promise<string> {
  return generatePrompt({
    contextHub,
    policyTemplate,
    companyName: organization.name ?? 'Company',
    companyWebsite: organization.website ?? 'https://company.com',
    frameworks,
  });
}

export async function generatePolicyContent(prompt: string): Promise<{
  type: 'document';
  content: Record<string, unknown>[];
}> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      output: 'no-schema',
      system: `You are an expert at writing security policies. Generate content directly as TipTap JSON format.

TipTap JSON structure:
- Root: {"type": "document", "content": [array of nodes]}
- Paragraphs: {"type": "paragraph", "content": [text nodes]}
- Headings: {"type": "heading", "attrs": {"level": 1-6}, "content": [text nodes]}
- Lists: {"type": "orderedList"/"bulletList", "content": [listItem nodes]}
- List items: {"type": "listItem", "content": [paragraph nodes]}
- Text: {"type": "text", "text": "content", "marks": [formatting]}
- Bold: {"type": "bold"} in marks array
- Italic: {"type": "italic"} in marks array

IMPORTANT: Follow ALL formatting instructions in the prompt, implementing them as proper TipTap JSON structures.
Return a JSON object with exactly this shape: {"type": "document", "content": [array of TipTap nodes]}`,
      prompt: `Generate a SOC 2 compliant security policy as a complete TipTap JSON document.

INSTRUCTIONS TO IMPLEMENT IN TIPTAP JSON:
${prompt.replace(/\\n/g, '\n')}

Return the complete TipTap document following ALL the above requirements using proper TipTap JSON structure.`,
    });

    const parsed = object as { type?: string; content?: unknown };
    if (parsed?.type !== 'document' || !Array.isArray(parsed?.content)) {
      throw new Error(
        'AI response did not match expected TipTap document structure',
      );
    }

    return {
      type: 'document' as const,
      content: parsed.content as Record<string, unknown>[],
    };
  } catch (aiError) {
    logger.error(`Error generating AI content: ${aiError}`);
    if (NoObjectGeneratedError.isInstance(aiError)) {
      logger.error(
        `NoObjectGeneratedError: ${JSON.stringify({
          cause: aiError.cause,
          text: aiError.text,
          response: aiError.response,
          usage: aiError.usage,
        })}`,
      );
    }
    throw aiError;
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
      include: { versions: { select: { id: true, pdfUrl: true } } },
    });

    if (!policy) throw new Error(`Policy not found: ${policyId}`);

    // Delete S3 files for existing versions
    const pdfUrlsToDelete = policy.versions
      .map((v) => v.pdfUrl)
      .filter((url): url is string => !!url);

    if (pdfUrlsToDelete.length > 0) {
      try {
        const { S3Client, DeleteObjectCommand } =
          await import('@aws-sdk/client-s3');
        const bucketName = process.env.APP_AWS_BUCKET_NAME;
        if (bucketName) {
          const s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
          });
          await Promise.allSettled(
            pdfUrlsToDelete.map((pdfUrl) =>
              s3.send(
                new DeleteObjectCommand({ Bucket: bucketName, Key: pdfUrl }),
              ),
            ),
          );
        }
      } catch (s3Error) {
        logger.error(`Error deleting S3 files during regeneration: ${s3Error}`);
      }
    }

    await db.$transaction(async (tx) => {
      // Clear version references first to avoid FK constraint issues during deletion.
      // Clear approverId alongside pendingVersionId so the two fields never diverge
      // — any lingering approverId without a pending version produces the inconsistent
      // state behind CS-254/260/261 ("No pending version to approve").
      if (policy.versions.length > 0) {
        await tx.policy.update({
          where: { id: policyId },
          data: {
            currentVersionId: null,
            pendingVersionId: null,
            approverId: null,
          },
        });
        await tx.policyVersion.deleteMany({ where: { policyId } });
      }

      const newVersion = await tx.policyVersion.create({
        data: {
          policyId,
          version: 1,
          content: content as unknown as Prisma.InputJsonValue[],
          publishedById: memberId || null,
          changelog: 'Regenerated policy content',
        },
      });

      await tx.policy.update({
        where: { id: policyId },
        data: {
          content: content as unknown as Prisma.InputJsonValue[],
          draftContent: content as unknown as Prisma.InputJsonValue[],
          currentVersionId: newVersion.id,
          pendingVersionId: null,
          approverId: null,
          signedBy: [],
          pdfUrl: null,
          displayFormat: 'EDITOR',
        },
      });
    });
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
  const prompt = await generatePolicyPrompt(
    policyTemplate,
    contextHub,
    organization,
    frameworks,
  );
  const updatedContent = await generatePolicyContent(prompt);
  await updatePolicyInDatabase(policyId, updatedContent.content, memberId);

  return {
    policyId,
    contextHub,
    updatedContent,
    policyName: policyTemplate.name,
  };
}
