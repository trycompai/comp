import { auth } from '@/utils/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { db } from '@db';
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from 'ai';
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

    const headerStore = await headers();
    const cookieStr = headerStore.get('cookie') ?? '';

    const { messages, currentContent }: { messages: Array<UIMessage>; currentContent?: string } = await req.json();

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

    // Prefer live editor content (sent from client) over DB content,
    // since the editor may have unsaved accepted changes
    const policyContentText = currentContent || convertPolicyContentToText(policy.content);

    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) policy editor. You help users edit and improve their organizational policies to meet compliance requirements like SOC 2, ISO 27001, and GDPR.

Current Policy Name: ${policy.name}
${policy.description ? `Policy Description: ${policy.description}` : ''}

Current Policy Content:
<current_policy>
${policyContentText}
</current_policy>

IMPORTANT: This assistant is ONLY for editing policies. You MUST always use one of the available tools.

Your role:
1. Edit and improve policies when asked
2. Ensure policies remain compliant with relevant frameworks
3. Maintain professional, clear language appropriate for official documentation

ORGANIZATIONAL CONTEXT TOOLS:
You have access to tools that let you look up real organizational data. Use them when the user asks you to incorporate specific information or when you need context to write accurate policy content:
- listVendors: Get a list of all vendors (name, category, status). Use this when adding vendor-related sections.
- getVendor: Get full details for a specific vendor (contacts, risk assessment, compliance). Use after listVendors to get specifics.
- listPolicies: List all other policies in the organization. Use for cross-referencing or ensuring consistency.
- getPolicy: Get the full content of another policy. Use when the user wants to align language or reference another policy.
- listEvidence: List evidence submissions (meeting minutes, access requests, pen tests, etc.). Use when referencing compliance evidence.

When incorporating organizational data into the policy, use the real names, categories, and details from the tools rather than generic placeholders.

IMPORTANT — FRESH PROPOSALS:
Each time the user requests a change, you MUST generate the proposed policy content from scratch using the <current_policy> provided in this prompt. NEVER copy or reuse content from a previous proposePolicy tool call in this conversation. The current policy content above is always the source of truth — previous proposals may have been rejected or modified.

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

SECTION BOUNDARIES:
A "section" is defined as a heading (##, ###, etc.) plus ALL content following it until the next heading of the same or higher level. This includes paragraphs, bullet lists, numbered lists, and any other content between headings.
- When asked to "remove a section", remove the heading AND everything below it up to (but not including) the next heading of the same or higher level.
- When asked to "edit a section", modify content within those same boundaries.
- Bullet lists that appear between two headings belong to the section started by the FIRST heading — never leave orphaned bullets after removing a section.
- A closing paragraph at the end of a section (e.g., "Retain records for...") is PART of that section and must be included in removals.

CRITICAL — PRESERVE UNCHANGED TEXT EXACTLY:
This is the most important rule. Violating it causes bugs in the diff UI.
- Copy every section you are NOT changing VERBATIM, character-for-character.
- Do NOT rephrase, reformat, reword, or "improve" sections the user did not ask you to change.
- Do NOT add, remove, or change punctuation, whitespace, line breaks, or list formatting in untouched sections.
- Do NOT "fix" grammar, spelling, or style in sections the user didn't mention.
- Do NOT consolidate, merge, reorder, or restructure existing sections unless explicitly asked.
- The ONLY differences between the current policy and your output should be the specific changes the user requested. Nothing more.
- If you are adding a new section, insert it at the appropriate location and leave ALL existing text identical.
- SELF-CHECK: Before returning, mentally diff your output against the current policy. If ANY line changed that the user did not ask you to change, revert that line to the original.

PER-SECTION FEEDBACK:
- When the user's message references a specific section (e.g., "For the section that says '...'"), they are giving targeted feedback on ONLY that part of the policy.
- Apply the requested change ONLY to the referenced section. Do NOT modify any other sections.
- Follow the user's instructions literally — if they say to insert text "in the middle", place it in the middle of that section, not at the end.
- Still provide the COMPLETE policy content via the proposePolicy tool, but only the targeted section should differ from the current policy.

Keep responses helpful and focused on the policy editing task.

FINAL REMINDER — THIS OVERRIDES EVERYTHING:
You MUST produce the policy by starting from the <current_policy> text above and making ONLY the specific change the user asked for. Every other line must be identical to <current_policy>. If your output has ANY differences beyond the user's request, you have made an error. Do not incorporate changes from previous proposePolicy calls in this conversation — those may have been rejected. The <current_policy> is the ONLY source of truth.`;

    // Strip previous proposePolicy tool content from the conversation history.
    // This prevents the AI from copying/reusing old proposals instead of
    // working from the current policy content in the system prompt.
    const cleanedMessages = messages.map((msg) => ({
      ...msg,
      parts: msg.parts.map((part) => {
        if (
          part.type === 'tool-invocation' &&
          (part as { toolName?: string }).toolName === 'proposePolicy'
        ) {
          return {
            ...part,
            args: { content: '[previous proposal removed — use <current_policy> from system prompt]', summary: '', title: '', detail: '', reviewHint: '' },
          };
        }
        return part;
      }),
    })) as Array<UIMessage>;

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: await convertToModelMessages(cleanedMessages),
      toolChoice: 'auto',
      stopWhen: stepCountIs(5),
      tools: getPolicyTools({ currentPolicyId: policyId, cookieHeader: cookieStr }),
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
