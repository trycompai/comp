import { tools } from '@/data/tools';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { openai } from '@ai-sdk/openai';
import { type UIMessage, convertToModelMessages, streamText } from 'ai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'No API key provided.' }, { status: 500 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const systemPrompt = `
    You're an expert in GRC, and a helpful assistant in Comp AI,
    a platform that helps companies get compliant with frameworks
    like SOC 2, ISO 27001 and GDPR.

    You must respond in basic markdown format (only use paragraphs, lists and bullet points).

    Keep responses concise and to the point.

    If you are unsure about the answer, say "I don't know" or "I don't know the answer to that question".
`;

  const result = streamText({
    model: openai('gpt-5'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
