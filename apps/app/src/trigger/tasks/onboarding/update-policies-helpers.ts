import { openai } from '@ai-sdk/openai';
import { db, FrameworkEditorFramework, FrameworkEditorPolicyTemplate, type Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk';
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

/**
 * Extract text from a heading node
 */
function extractHeadingText(node: Record<string, unknown>): string {
  const type = typeof node['type'] === 'string' ? (node['type'] as string) : '';
  if (type !== 'heading') return '';
  return extractText(node).trim();
}

/**
 * Get allowed top-level heading titles from the original/template content
 * We consider headings with level 1 or 2 as top-level anchors for section boundaries.
 */
function getAllowedTopLevelHeadings(originalContent: Record<string, unknown>[]): string[] {
  const allowed: string[] = [];
  for (const node of originalContent) {
    const type = typeof node['type'] === 'string' ? (node['type'] as string) : '';
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

/**
 * Remove sections that should not exist (Table of Contents, Mapping sections) and
 * drop any new top-level sections not present in the original/template headings.
 */
function alignToTemplateStructure(
  updated: { type: 'document'; content: Record<string, unknown>[] },
  originalContent: Record<string, unknown>[],
): { type: 'document'; content: Record<string, unknown>[] } {
  const allowedTopHeadings = getAllowedTopLevelHeadings(originalContent);
  if (allowedTopHeadings.length === 0) {
    // Nothing to enforce; return as-is
    return updated;
  }

  const isForbiddenHeading = (headingText: string): boolean => {
    const lower = headingText.toLowerCase();
    if (lower.includes('table of contents')) return true;
    if (lower.includes('mapping') && lower.includes('soc')) return true; // e.g., SOC 2 mappings
    return false;
  };

  const result: Record<string, unknown>[] = [];
  let i = 0;
  const content = Array.isArray(updated.content) ? updated.content : [];

  while (i < content.length) {
    const node = content[i] as Record<string, unknown>;
    const nodeType = typeof node['type'] === 'string' ? (node['type'] as string) : '';

    if (nodeType === 'heading') {
      const level = (node as any)?.attrs?.level;
      const headingText = extractHeadingText(node);

      // Skip forbidden sections entirely
      if (isForbiddenHeading(headingText)) {
        i += 1;
        while (i < content.length) {
          const nextNode = content[i] as Record<string, unknown>;
          const nextType = typeof nextNode['type'] === 'string' ? (nextNode['type'] as string) : '';
          if (nextType === 'heading') break;
          i += 1;
        }
        continue;
      }

      // Enforce allowed top-level headings
      if (typeof level === 'number' && level >= 1 && level <= 2) {
        const normalized = headingText.toLowerCase();
        if (!allowedTopHeadings.includes(normalized)) {
          // Drop this new top-level section and its content until next heading
          i += 1;
          while (i < content.length) {
            const nextNode = content[i] as Record<string, unknown>;
            const nextType =
              typeof nextNode['type'] === 'string' ? (nextNode['type'] as string) : '';
            if (nextType === 'heading') break;
            i += 1;
          }
          continue;
        }
      }
    }

    // Keep node (with placeholder sanitization already applied earlier)
    result.push(node);
    i += 1;
  }

  return { type: 'document', content: result };
}

/**
 * AI reconciliation step: ensure the draft keeps the same top-level section structure
 * as the original template while using the new content where headings match.
 * - Preserve the order and heading levels from the original.
 * - For each top-level heading in the original, use the draft section content if present
 *   (matched by heading text, case-insensitive); otherwise keep the original section content.
 * - Do not introduce new top-level sections, TOC, or mapping sections.
 */
export async function reconcileFormatWithTemplate(
  originalContent: Record<string, unknown>[],
  draft: { type: 'document'; content: Record<string, unknown>[] },
): Promise<{ type: 'document'; content: Record<string, unknown>[] }> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      system: `You are an expert policy editor.
Given an ORIGINAL policy TipTap JSON and a DRAFT TipTap JSON, produce a FINAL TipTap JSON that:
- Preserves the ORIGINAL top-level section structure (order and presence of titles) and visual presentation of titles.
- VISUAL CONSISTENCY: For each ORIGINAL top-level title, match its visual style in the FINAL exactly:
  - If the ORIGINAL uses a heading, keep the same heading level in the FINAL.
  - If the ORIGINAL uses a bold paragraph as the title, use a bold paragraph for that title in the FINAL (single text node with a bold mark).
  - After each title, ensure at least one paragraph node exists (may be empty if content is not provided).
- CONTENT SELECTION: For each ORIGINAL title, prefer the DRAFT's corresponding section content when the title text matches (case-insensitive). If no matching DRAFT section exists, keep the ORIGINAL section content.
- COMPLETENESS: Include every ORIGINAL top-level title exactly once and in the same order as the ORIGINAL. Do not omit any original section, even if the DRAFT lacks content for it (in that case, keep the ORIGINAL section or include an empty paragraph placeholder under the title).
- PROHIBITIONS: Do not add new top-level sections. Do not include a Table of Contents. Do not add framework mapping sections unless they already exist in the ORIGINAL.
- OUTPUT FORMAT: Valid TipTap JSON with root {"type":"document","content":[...]}.`,
      prompt: `ORIGINAL (TipTap JSON):\n${JSON.stringify({ type: 'document', content: originalContent })}\n\nDRAFT (TipTap JSON):\n${JSON.stringify(draft)}\n\nReturn ONLY the FINAL TipTap JSON document with type "document" and a "content" array.
Follow the structure rules above strictly.`,
      schema: z.object({
        type: z.literal('document'),
        content: z.array(z.record(z.string(), z.unknown())),
      }),
    });
    return object;
  } catch (error) {
    logger.error('AI reconcile format step failed; falling back to deterministic alignment', {
      error: error instanceof Error ? error.message : String(error),
    });
    return draft;
  }
}

/**
 * AI format checker: returns whether DRAFT conforms to ORIGINAL's format
 */
export async function aiCheckFormatWithTemplate(
  originalContent: Record<string, unknown>[],
  draft: { type: 'document'; content: Record<string, unknown>[] },
): Promise<{ isConforming: boolean; reasons: string[] }> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      system: `You are validating policy layout.
Compare ORIGINAL vs DRAFT (TipTap JSON). Determine if DRAFT conforms to ORIGINAL format:
- Same top-level section titles present and in the same order
- Title visual style matches (heading level vs bold paragraph)
- No new top-level sections added; no Table of Contents; no framework mapping sections if not in ORIGINAL
- After every title there is at least one paragraph node
Return JSON { isConforming: boolean, reasons: string[] }.
`,
      prompt: `ORIGINAL:\n${JSON.stringify({ type: 'document', content: originalContent })}\n\nDRAFT:\n${JSON.stringify(draft)}\n\nRespond only with the JSON object.`,
      schema: z.object({
        isConforming: z.boolean(),
        reasons: z.array(z.string()).default([]),
      }),
    });
    return object;
  } catch (error) {
    logger.error('AI format check failed, defaulting to not conforming', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { isConforming: false, reasons: ['checker_failed'] };
  }
}

/**
 * VISUAL LAYOUT ENFORCEMENT
 * Make the draft visually match the template with respect to section title presentation:
 * - If the template uses a heading (level 1/2) for a title, ensure the draft uses the same heading level for that title
 * - If the template uses a bold paragraph as a title, ensure the draft does the same (single text node, bold mark)
 * - After each title, ensure at least one paragraph node exists
 */
function isBoldParagraphTitle(node: Record<string, unknown>): boolean {
  if ((node as any)?.type !== 'paragraph') return false;
  const content = Array.isArray((node as any)?.content) ? ((node as any).content as any[]) : [];
  if (content.length !== 1) return false;
  const t = content[0];
  if (!t || t.type !== 'text' || typeof t.text !== 'string') return false;
  const marks = Array.isArray(t.marks) ? (t.marks as any[]) : [];
  return marks.some((m) => m?.type === 'bold');
}

function toBoldTitleParagraph(text: string): Record<string, unknown> {
  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text,
        marks: [{ type: 'bold' }],
      },
    ],
  } as Record<string, unknown>;
}

type TitlePattern = { kind: 'heading'; level: number } | { kind: 'boldParagraph' };

function getTitlePatternMap(original: Record<string, unknown>[]): Map<string, TitlePattern> {
  const map = new Map<string, TitlePattern>();
  for (const node of original) {
    const type = (node as any)?.type as string;
    if (type === 'heading') {
      const level = (node as any)?.attrs?.level;
      const text = extractHeadingText(node);
      if (text && typeof level === 'number') {
        map.set(text.trim().toLowerCase(), { kind: 'heading', level });
      }
    } else if (isBoldParagraphTitle(node)) {
      const text = extractText(node);
      if (text) {
        map.set(text.trim().toLowerCase(), { kind: 'boldParagraph' });
      }
    }
  }
  return map;
}

export function enforceVisualLayoutWithTemplate(
  original: Record<string, unknown>[],
  draft: { type: 'document'; content: Record<string, unknown>[] },
): { type: 'document'; content: Record<string, unknown>[] } {
  const content = Array.isArray(draft.content) ? draft.content : [];
  const patternMap = getTitlePatternMap(original);
  if (patternMap.size === 0) return draft;

  const out: Record<string, unknown>[] = [];

  for (let i = 0; i < content.length; i += 1) {
    const node = content[i] as Record<string, unknown>;
    const type = (node as any)?.type as string;
    let pushed = false;

    if (type === 'heading' || isBoldParagraphTitle(node)) {
      const titleText = (type === 'heading' ? extractHeadingText(node) : extractText(node)).trim();
      const key = titleText.toLowerCase();
      const pattern = titleText ? patternMap.get(key) : undefined;

      if (pattern) {
        if (pattern.kind === 'heading') {
          out.push({
            type: 'heading',
            attrs: { level: pattern.level },
            content: [{ type: 'text', text: titleText }],
          });
          pushed = true;
        } else if (pattern.kind === 'boldParagraph') {
          out.push(toBoldTitleParagraph(titleText));
          pushed = true;
        }

        if (pushed) {
          // Ensure at least one paragraph follows a title
          const next = content[i + 1] as Record<string, unknown> | undefined;
          const nextType = (next as any)?.type as string | undefined;
          if (!next || nextType === 'heading') {
            out.push({ type: 'paragraph', content: [] });
          }
          continue;
        }
      }
    }

    out.push(node);
  }

  return { type: 'document', content: out };
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
  policyName: string;
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

  if (!organization) {
    throw new Error(`Organization not found for ${organizationId}`);
  }

  if (!policy) {
    throw new Error(`Policy not found for ${policyId}`);
  }

  if (!policy.policyTemplateId) {
    throw new Error(`Policy template not found for ${policyId}`);
  }

  const policyTemplate = await db.frameworkEditorPolicyTemplate.findUnique({
    where: { id: policy.policyTemplateId },
  });

  if (!policyTemplate) {
    throw new Error(`Policy template not found for ${policy.policyTemplateId}`);
  }

  return { organization, policy, policyTemplate };
}

/**
 * Generates the prompt for policy content generation
 */
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
        content: z.array(z.record(z.string(), z.unknown())),
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
  const { organization, policyTemplate } = await fetchOrganizationAndPolicy(
    organizationId,
    policyId,
  );

  // Generate prompt for AI
  const prompt = await generatePolicyPrompt(policyTemplate, contextHub, organization, frameworks);

  // Generate new policy content
  const updatedContent = await generatePolicyContent(prompt);

  // Update policy in database
  await updatePolicyInDatabase(policyId, updatedContent.content);

  return {
    policyId,
    contextHub,
    updatedContent,
    policyName: policyTemplate.name,
  };
}
