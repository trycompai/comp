import { getTools } from '@/data/tools';
import { getGT } from 'gt-next/server';
import { auth } from '@/utils/auth';
import { groq } from '@ai-sdk/groq';
import { type UIMessage, convertToModelMessages, streamText } from 'ai';
import { headers } from 'next/headers';

export const maxDuration = 30;

export async function POST(req: Request) {
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

  const t = await getGT();
  const tools = getTools(t);

  const result = streamText({
    model: groq('deepseek-r1-distill-llama-70b'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
