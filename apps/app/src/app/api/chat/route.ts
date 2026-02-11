import { tools } from '@/data/tools';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { openai } from '@ai-sdk/openai';
import { db } from '@db/server';
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

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const organizationIdFromHeader = req.headers.get('x-organization-id')?.trim();
  const organizationIdFromSession = session.session.activeOrganizationId;

  // Prefer deterministic org context from URL → client header.
  const organizationId = organizationIdFromHeader ?? organizationIdFromSession;

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization context required (missing X-Organization-Id).' },
      { status: 400 },
    );
  }

  // Validate the user is a member of the requested org.
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
    select: { id: true },
  });

  if (!member) {
    return new Response('Unauthorized', { status: 401 });
  }

  const nowIso = new Date().toISOString();

  const systemPrompt = `
    You're an expert in GRC, and a helpful assistant in Comp AI,
    a platform that helps companies get compliant with frameworks
    like SOC 2, ISO 27001 and GDPR.

    You must respond in basic markdown format (only use paragraphs, lists and bullet points).

    Keep responses concise and to the point.

    If you are unsure about the answer, say "I don't know" or "I don't know the answer to that question".

    Important:
    - Today's date/time is ${nowIso}.
    - You are assisting a user inside a live application (organizationId: ${organizationId}).
    - Prefer using available tools to fetch up-to-date org data (policies, risks, organization details) rather than guessing.
    - If the question depends on the customer's current configuration/data and you haven't retrieved it, call the relevant tool first.
`;

  const result = streamText({
    model: openai('gpt-5'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
