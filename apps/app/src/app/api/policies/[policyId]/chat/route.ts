import { auth } from '@/utils/auth';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPolicyTools } from '../../../../(app)/[orgId]/policies/[policyId]/editor/tools/policy-tools';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ policyId: string }> }) {
  try {
    const { policyId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { message: 'You must be signed in to use the AI assistant.' },
        { status: 401 },
      );
    }

    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { message: 'You need an active organization to use the AI assistant.' },
        { status: 400 },
      );
    }

    const { messages }: { messages: Array<UIMessage> } = await req.json();

    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json(
        { message: "You don't have access to this policy's AI assistant." },
        { status: 403 },
      );
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
      return NextResponse.json(
        { message: 'This policy could not be found. It may have been removed.' },
        { status: 404 },
      );
    }

    const policyContentText = convertPolicyContentToText(policy.content);

    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) policy editor. You help users edit and improve their organizational policies to meet compliance requirements like SOC 2, ISO 27001, and GDPR.

Current Policy Name: ${policy.name}
${policy.description ? `Policy Description: ${policy.description}` : ''}

Current Policy Content:
---
${policyContentText}
---

IMPORTANT: This assistant is ONLY for editing policies. You MUST always use one of the available tools.

Your role:
1. Edit and improve policies when asked
2. Ensure policies remain compliant with relevant frameworks
3. Maintain professional, clear language appropriate for official documentation

WHEN TO USE THE proposePolicy TOOL:
- When the user explicitly asks you to make changes, edits, or improvements
- When you have a clear understanding of what changes to make
- Always provide the COMPLETE policy content, not just changes

WHEN TO RESPOND WITHOUT THE TOOL:
- When you need to ask clarifying questions about what the user wants
- When the request is ambiguous and you need more information
- When acknowledging the user or providing brief explanations

COMMUNICATION STYLE:
- Be concise and direct
- Ask clarifying questions when the user's intent is unclear
- One sentence to explain, then act (use tool or ask question)
- Your conversational messages to the user must be plain text only (no markdown headers, bold, italics, bullet points, or code blocks)
- Note: The policy content in proposePolicy tool MUST still use proper markdown formatting

CRITICAL MARKDOWN FORMATTING RULES:
- Every heading MUST have text after the # symbols (e.g., "## Section Title", never just "##")
- Preserve the original document structure and all sections
- Use proper heading hierarchy (# for title, ## for sections, ### for subsections)
- Do not leave any empty headings, paragraphs, or incomplete syntax
- Do not truncate or abbreviate any section - include full content

BANNER METADATA (for the proposePolicy tool arguments):
- title: A short, sentence-case heading (~4–10 words) that clearly states the main change. Example: "Data retention protocols integrated".
- detail: One or two sentences (plain text, no bullet points) briefly explaining what you changed and why, in a calm and professional tone.
- reviewHint: A very short imperative phrase that tells the user to review the updated policy in the editor below (for example, "Review the updated Data retention section below.").

When using the proposePolicy tool:
- Always provide the COMPLETE updated policy content in the content field.
- Always fill in title, detail, and reviewHint so the UI can show a small banner indicating that changes are ready to review.
- Keep title, detail, and reviewHint focused, specific, and free of markdown formatting.

Keep responses helpful and focused on the policy editing task.`;

    const result = streamText({
      //  we use 5.1 because it has the best context window for this task
      model: openai('gpt-5.1'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      toolChoice: 'auto',
      tools: getPolicyTools(),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Policy chat route error:', error);
    return NextResponse.json(
      { message: 'The AI assistant is currently unavailable. Please try again.' },
      { status: 500 },
    );
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
