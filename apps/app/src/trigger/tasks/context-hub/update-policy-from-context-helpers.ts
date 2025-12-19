import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk/v3';
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { tiptapToText, type TipTapNode } from '../../lib/tiptap-to-text';

interface ContextUpdateParams {
  organizationId: string;
  policyId: string;
  contextQuestion: string;
  contextAnswer: string;
}

export interface PolicyDiff {
  policyId: string;
  policyName: string;
  oldTextPreview: string;
  newTextPreview: string;
  sectionsModified: string[];
}

function extractText(node: TipTapNode): string {
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return (node.content as TipTapNode[]).map(extractText).join('');
  }
  return '';
}

function findSectionByHeading(
  content: TipTapNode[],
  headingText: string,
): { start: number; end: number; nodes: TipTapNode[] } | null {
  const normalizedHeading = headingText.toLowerCase().trim();

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node.type === 'heading') {
      const text = extractText(node).toLowerCase().trim();
      if (text.includes(normalizedHeading) || normalizedHeading.includes(text)) {
        let end = content.length;
        for (let j = i + 1; j < content.length; j++) {
          if (content[j].type === 'heading') {
            const level = (content[j].attrs as { level?: number })?.level ?? 1;
            const currentLevel = (node.attrs as { level?: number })?.level ?? 1;
            if (level <= currentLevel) {
              end = j;
              break;
            }
          }
        }
        return {
          start: i,
          end,
          nodes: content.slice(i, end),
        };
      }
    }
  }
  return null;
}

function replaceSection(
  content: TipTapNode[],
  sectionHeading: string,
  newNodes: TipTapNode[],
): TipTapNode[] {
  const section = findSectionByHeading(content, sectionHeading);
  if (!section) {
    logger.warn(`Section "${sectionHeading}" not found, appending new content`);
    return [...content, ...newNodes];
  }

  return [...content.slice(0, section.start), ...newNodes, ...content.slice(section.end)];
}

function updateParagraphText(
  content: TipTapNode[],
  oldText: string,
  newText: string,
): TipTapNode[] {
  const normalizedOld = oldText.toLowerCase().trim();

  function updateNode(node: TipTapNode): TipTapNode {
    if (node.type === 'paragraph' || node.type === 'listItem') {
      const nodeText = extractText(node).toLowerCase().trim();
      if (nodeText.includes(normalizedOld)) {
        return {
          ...node,
          content: [{ type: 'text', text: newText }],
        };
      }
    }
    if (Array.isArray(node.content)) {
      return {
        ...node,
        content: (node.content as TipTapNode[]).map(updateNode),
      };
    }
    return node;
  }

  return content.map(updateNode);
}

export async function updatePolicyFromContext(
  params: ContextUpdateParams,
): Promise<{ diff: PolicyDiff; newContent: TipTapNode[] } | null> {
  const { organizationId, policyId, contextQuestion, contextAnswer } = params;

  const policy = await db.policy.findUnique({
    where: { id: policyId, organizationId },
    include: {
      policyTemplate: { select: { name: true } },
    },
  });

  if (!policy || !policy.content) {
    logger.error(`Policy ${policyId} not found or has no content`);
    return null;
  }

  const originalContent = policy.content as TipTapNode[];
  const policyName = policy.policyTemplate?.name ?? policy.name;
  const originalText = tiptapToText(originalContent);

  let modifiedContent = [...originalContent];
  const sectionsModified: string[] = [];

  const patchTools = {
    replaceSection: tool({
      description:
        'Replace an entire section of the policy by heading. Use this when the context change requires updating multiple paragraphs within a section.',
      inputSchema: z.object({
        sectionHeading: z
          .string()
          .describe('The heading text of the section to replace (e.g., "Scope", "Purpose")'),
        newContent: z.array(
          z.object({
            type: z.enum(['heading', 'paragraph', 'bulletList', 'orderedList']),
            text: z.string().optional().describe('Text content for heading or paragraph'),
            items: z
              .array(z.string())
              .optional()
              .describe('List items for bulletList or orderedList'),
            level: z.number().optional().describe('Heading level (1-6)'),
          }),
        ),
      }),
      execute: async ({ sectionHeading, newContent }) => {
        const newNodes: TipTapNode[] = newContent.map((item) => {
          if (item.type === 'heading') {
            return {
              type: 'heading',
              attrs: { level: item.level ?? 2 },
              content: [{ type: 'text', text: item.text ?? '' }],
            };
          }
          if (item.type === 'paragraph') {
            return {
              type: 'paragraph',
              attrs: { textAlign: null },
              content: [{ type: 'text', text: item.text ?? '' }],
            };
          }
          if (item.type === 'bulletList' || item.type === 'orderedList') {
            return {
              type: item.type,
              content: (item.items ?? []).map((itemText) => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: itemText }],
                  },
                ],
              })),
            };
          }
          return { type: 'paragraph', content: [] };
        });

        modifiedContent = replaceSection(modifiedContent, sectionHeading, newNodes);
        sectionsModified.push(sectionHeading);
        return `Successfully replaced section "${sectionHeading}"`;
      },
    }),

    updateText: tool({
      description:
        'Update specific text within the policy. Use this for small, targeted text changes.',
      inputSchema: z.object({
        oldText: z.string().describe('The existing text to find and replace (partial match)'),
        newText: z.string().describe('The new text to replace it with'),
        reason: z.string().describe('Why this change is being made'),
      }),
      execute: async ({ oldText, newText, reason }) => {
        modifiedContent = updateParagraphText(modifiedContent, oldText, newText);
        sectionsModified.push(`Text update: ${reason}`);
        return `Successfully updated text: "${oldText}" -> "${newText}"`;
      },
    }),

    addToSection: tool({
      description: 'Add new content to an existing section without replacing it entirely.',
      inputSchema: z.object({
        sectionHeading: z.string().describe('The heading of the section to add content to'),
        content: z.object({
          type: z.enum(['paragraph', 'bulletList', 'orderedList']),
          text: z.string().optional(),
          items: z.array(z.string()).optional(),
        }),
        position: z.enum(['start', 'end']).default('end'),
      }),
      execute: async ({ sectionHeading, content, position }) => {
        const section = findSectionByHeading(modifiedContent, sectionHeading);
        if (!section) {
          return `Section "${sectionHeading}" not found`;
        }

        let newNode: TipTapNode;
        if (content.type === 'paragraph') {
          newNode = {
            type: 'paragraph',
            attrs: { textAlign: null },
            content: [{ type: 'text', text: content.text ?? '' }],
          };
        } else {
          newNode = {
            type: content.type,
            content: (content.items ?? []).map((item) => ({
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null },
                  content: [{ type: 'text', text: item }],
                },
              ],
            })),
          };
        }

        const insertIndex = position === 'start' ? section.start + 1 : section.end;
        modifiedContent = [
          ...modifiedContent.slice(0, insertIndex),
          newNode,
          ...modifiedContent.slice(insertIndex),
        ];

        sectionsModified.push(`Added to: ${sectionHeading}`);
        return `Successfully added content to section "${sectionHeading}"`;
      },
    }),

    noChangesNeeded: tool({
      description:
        'Call this if after analysis you determine the context change does not require any updates to this policy.',
      inputSchema: z.object({
        reason: z.string().describe('Explanation of why no changes are needed'),
      }),
      execute: async ({ reason }) => {
        logger.info(`No changes needed for policy ${policyId}: ${reason}`);
        return 'No changes applied';
      },
    }),
  };

  try {
    await generateText({
      model: openai('gpt-4.1-mini'),
      tools: patchTools,
      stopWhen: stepCountIs(10),
      system: `You are a policy editing assistant. You are given a context change (a question and answer about the organization) and the current policy content. Your job is to update the policy to reflect this context change.

Rules:
1. Only make changes that are DIRECTLY relevant to the context change
2. Preserve the existing structure and formatting of the policy
3. Use the provided tools to make targeted updates
4. If the context change doesn't affect this policy, call noChangesNeeded
5. Be conservative - don't add information that isn't supported by the context
6. Maintain professional policy language`,
      prompt: `Context Change:
Question: ${contextQuestion}
Answer: ${contextAnswer}

Current Policy: "${policyName}"

Policy Content (as TipTap JSON structure):
${JSON.stringify(originalContent, null, 2)}

Analyze this policy and determine what changes, if any, are needed based on the context change. Use the tools to make targeted updates.`,
    });

    if (sectionsModified.length === 0) {
      return null;
    }

    const newText = tiptapToText(modifiedContent);

    await db.policy.update({
      where: { id: policyId },
      data: { content: modifiedContent as JSONContent[] },
    });

    return {
      diff: {
        policyId,
        policyName,
        oldTextPreview: originalText.slice(0, 500),
        newTextPreview: newText.slice(0, 500),
        sectionsModified,
      },
      newContent: modifiedContent,
    };
  } catch (error) {
    logger.error(`Error updating policy ${policyId} from context:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
