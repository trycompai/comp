import { auth } from '@/utils/auth';
import { db } from '@db';
import { openai } from '@ai-sdk/openai';
import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
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
      return NextResponse.json(
        { message: 'No active organization' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { message: 'Not a member of this organization' },
        { status: 403 }
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

When the user asks you to make changes to the policy:
1. First explain what changes you'll make and why
2. Then provide the COMPLETE updated policy content in a code block with the label \`\`\`policy
3. The policy content inside the code block should be in markdown format

IMPORTANT: When providing updated policy content, you MUST include the ENTIRE policy, not just the changed sections. The content in the \`\`\`policy code block will replace the entire current policy.

Keep responses helpful and focused on the policy editing task.`;

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { message: 'Failed to process AI request' },
      { status: 500 }
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
