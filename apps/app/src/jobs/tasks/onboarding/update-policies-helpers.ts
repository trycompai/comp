import { openai } from '@ai-sdk/openai';
import { db, FrameworkEditorFramework, type Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk/v3';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { generatePrompt } from '../../lib/prompts';

// Sanitization utilities
const PLACEHOLDER_REGEX = /<<\s*TO\s*REVIEW\s*>>/gi;

function extractText(node: Record<string, unknown>): string {
  const text = node && typeof node['text'] === 'string' ? (node['text'] as string) : '';
  const content = Array.isArray((node as any)?.content)
    ? ((node as any).content as Record<string, unknown>[])
    : null;
  if (content && content.length > 0) {
    return content.map(extractText).join('');
  }
  return text || '';
}

function sanitizeNodePlaceholders(node: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = { ...node };
  if (typeof cloned['text'] === 'string') {
    const replaced = (cloned['text'] as string)
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
  // Match variations: artefacts/artifacts and with/without "evidence"
  return lower.includes('auditor') && (lower.includes('artefact') || lower.includes('artifact'));
}

function removeAuditorArtifactsSection(
  content: Record<string, unknown>[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  let i = 0;
  while (i < content.length) {
    const node = content[i] as Record<string, unknown>;
    const nodeType = typeof node['type'] === 'string' ? (node['type'] as string) : '';
    if (nodeType === 'heading') {
      const headingText = extractText(node);
      if (shouldRemoveAuditorArtifactsHeading(headingText)) {
        // Skip this heading and subsequent nodes until next heading or end
        i += 1;
        while (i < content.length) {
          const nextNode = content[i] as Record<string, unknown>;
          const nextType = typeof nextNode['type'] === 'string' ? (nextNode['type'] as string) : '';
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

function sanitizeDocument(document: { type: 'document'; content: Record<string, unknown>[] }) {
  const content = Array.isArray(document.content) ? document.content : [];
  const withoutAuditorArtifacts = removeAuditorArtifactsSection(content);
  return {
    type: 'document' as const,
    content: withoutAuditorArtifacts,
  };
}

// Types
export type OrganizationData = {
  id: string;
  name: string | null;
  website: string | null;
};

// Use Prisma `Policy` type downstream instead of a local narrow type

export type UpdatePolicyParams = {
  organizationId: string;
  policyId: string;
  contextHub: string;
  frameworks: FrameworkEditorFramework[];
};

export type PolicyUpdateResult = {
  policyId: string;
  contextHub: string;
  policy: Policy;
  updatedContent: {
    type: 'document';
    content: Record<string, unknown>[];
  };
};

/**
 * Fetches organization and policy data from database
 */
export async function fetchOrganizationAndPolicy(
  organizationId: string,
  policyId: string,
): Promise<{ organization: OrganizationData; policy: Policy }> {
  const [organization, policy] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, website: true },
    }),
    db.policy.findUnique({
      where: { id: policyId, organizationId },
    }),
  ]);

  if (!organization) {
    throw new Error(`Organization not found for ${organizationId}`);
  }

  if (!policy) {
    throw new Error(`Policy not found for ${policyId}`);
  }

  return { organization, policy };
}

/**
 * Generates the prompt for policy content generation
 */
export async function generatePolicyPrompt(
  policy: Policy,
  contextHub: string,
  organization: OrganizationData,
  frameworks: FrameworkEditorFramework[],
): Promise<string> {
  return generatePrompt({
    existingPolicyContent: (policy.content as unknown as JSONContent | JSONContent[]) ?? [],
    contextHub,
    policy,
    companyName: organization.name ?? 'Company',
    companyWebsite: organization.website ?? 'https://company.com',
    frameworks,
  });
}

/**
 * Generates policy content using AI with TipTap JSON schema
 */
export async function generatePolicyContent(prompt: string): Promise<{
  type: 'document';
  content: Record<string, unknown>[];
}> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      mode: 'json',
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

IMPORTANT: Follow ALL formatting instructions in the prompt, implementing them as proper TipTap JSON structures.`,
      prompt: `Generate a SOC 2 compliant security policy as a complete TipTap JSON document.

INSTRUCTIONS TO IMPLEMENT IN TIPTAP JSON:
${prompt.replace(/\\n/g, '\n')}

Return the complete TipTap document following ALL the above requirements using proper TipTap JSON structure.`,
      schema: z.object({
        type: z.literal('document'),
        content: z.array(z.record(z.unknown())),
      }),
    });

    return object;
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

/**
 * Updates policy content in the database
 */
export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
): Promise<void> {
  try {
    await db.policy.update({
      where: { id: policyId },
      data: { content: content as JSONContent[] },
    });
  } catch (dbError) {
    logger.error(`Failed to update policy in database: ${dbError}`);
    throw dbError;
  }
}

/**
 * Complete policy update workflow
 */
export async function processPolicyUpdate(params: UpdatePolicyParams): Promise<PolicyUpdateResult> {
  const { organizationId, policyId, contextHub, frameworks } = params;

  // Fetch organization and policy data
  const { organization, policy } = await fetchOrganizationAndPolicy(organizationId, policyId);

  // Generate prompt for AI
  const prompt = await generatePolicyPrompt(policy, contextHub, organization, frameworks);

  // Generate new policy content
  const updatedContent = await generatePolicyContent(prompt);

  // Remove placeholders and any Auditor Artefacts/Artifacts sections before saving
  const sanitized = sanitizeDocument(updatedContent);

  // Update policy in database
  await updatePolicyInDatabase(policyId, sanitized.content);

  return {
    policyId,
    contextHub,
    policy,
    updatedContent: sanitized,
  };
}
