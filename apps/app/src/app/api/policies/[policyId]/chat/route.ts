import { auth } from '@/utils/auth';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ policyId: string }> }) {
  try {
    const { policyId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json({ message: 'No active organization' }, { status: 400 });
    }

    const body = await req.json();
    const { messages } = body as { messages: Array<UIMessage> };

    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ message: 'Not a member of this organization' }, { status: 403 });
    }

    const policy = await db.policy.findFirst({
      where: {
        id: policyId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
      },
    });

    if (!policy) {
      return NextResponse.json({ message: 'Policy not found' }, { status: 404 });
    }

    const policyContentText = convertPolicyContentToText(policy.content);

    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) policy editor. You help users edit and improve their organizational policies to meet compliance requirements like SOC 2, ISO 27001, and GDPR.

Current Policy Name: ${policy.name}
${policy.description ? `Policy Description: ${policy.description}` : ''}

Current Policy Content:
---
${policyContentText}
---

Your role:
1. Help users understand and improve their policies
2. Suggest specific changes when asked
3. Ensure policies remain compliant with relevant frameworks
4. Maintain professional, clear language appropriate for official documentation

COMMUNICATION STYLE:
- Be concise and direct. No lengthy explanations or preamble.
- Do not use bullet points in responses unless asked.
- One sentence to explain, then act.

WHEN MAKING POLICY CHANGES:
Use the proposePolicy tool immediately. State what you'll change in ONE sentence, then call the tool.

CRITICAL MARKDOWN FORMATTING RULES:
- Every heading MUST have text after the # symbols (e.g., "## Section Title", never just "##")
- Preserve the original document structure and all sections
- Use proper heading hierarchy (# for title, ## for sections, ### for subsections)
- Ensure all lists are properly formatted with consistent indentation
- Do not leave any empty headings, paragraphs, or incomplete syntax
- Do not truncate or abbreviate any section - include full content
- If you're unsure about a section, keep the original text

QUALITY CHECKLIST before submitting:
- All headings have proper titles after # symbols
- Document starts with a clear title (# Policy Title)
- All original sections are preserved unless explicitly asked to remove
- No markdown syntax errors (unclosed brackets, incomplete lists)
- Professional tone maintained throughout

Keep responses helpful and focused on the policy editing task.`;

    const result = streamText({
      model: openai('gpt-5.1'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        proposePolicy: tool({
          description:
            'Propose an updated version of the policy. Use this tool whenever the user asks you to make changes, edits, or improvements to the policy. You must provide the COMPLETE policy content, not just the changes.',
          inputSchema: z.object({
            content: z
              .string()
              .describe(
                'The complete updated policy content in markdown format. Must include the entire policy, not just the changed sections.',
              ),
            summary: z
              .string()
              .describe('One to two sentences summarizing the changes. No bullet points.'),
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json({ message: 'Failed to process AI request' }, { status: 500 });
  }
}

function convertPolicyContentToText(content: unknown): string {
  if (!content) return '';

  const contentArray = Array.isArray(content) ? content : [content];

  function extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return '';

    const n = node as Record<string, unknown>;

    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text;
    }

    if (Array.isArray(n.content)) {
      const texts = n.content.map(extractText).filter(Boolean);

      switch (n.type) {
        case 'heading': {
          const level = (n.attrs as Record<string, unknown>)?.level || 1;
          return '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n';
        }
        case 'paragraph':
          return texts.join('') + '\n';
        case 'bulletList':
        case 'orderedList':
          return '\n' + texts.join('');
        case 'listItem':
          return '- ' + texts.join('') + '\n';
        case 'blockquote':
          return '\n> ' + texts.join('\n> ') + '\n';
        default:
          return texts.join('');
      }
    }

    return '';
  }

  return contentArray.map(extractText).join('\n').trim();
}
