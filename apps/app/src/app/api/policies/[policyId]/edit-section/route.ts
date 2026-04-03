import { auth } from '@/utils/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Standalone API for editing a specific section of a policy suggestion.
 * This is NOT part of the main chat — it's a focused, single-turn call
 * that takes a section's current proposed text + user feedback and returns
 * only the updated section text.
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sectionText, feedback } = await req.json() as {
      sectionText: string;
      feedback: string;
    };

    if (!sectionText || !feedback) {
      return NextResponse.json({ error: 'Missing sectionText or feedback' }, { status: 400 });
    }

    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: `You are a GRC policy editor. You will receive text from a policy and feedback on how to change it. Return ONLY the updated text. Rules:
- Do not include explanations, preamble, or commentary — just the updated text.
- If the input is a plain sentence or paragraph, return a plain sentence or paragraph. Do NOT add markdown formatting (no ##, no **, no -) unless the input already uses it.
- If the input includes markdown headings (##) or bullet lists (- ), preserve that structure.
- Match the tone and style of the input.`,
      prompt: `Text to edit:\n${sectionText}\n\nInstruction: ${feedback}`,
    });

    return NextResponse.json({ updatedText: result.text.trim() });
  } catch (error) {
    console.error('Edit section error:', error);
    return NextResponse.json({ error: 'Failed to edit section' }, { status: 500 });
  }
}
