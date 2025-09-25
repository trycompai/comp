import { Models } from '@/ai/constants';
import { readMarkdownFromModule } from '@/lib/read-markdown';
import { generateObject } from 'ai';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';
import {
  linesSchema,
  resultSchema,
} from '../../../(app)/[orgId]/tasks/[taskId]/automation/components/error-monitor/schemas';

export async function POST(req: Request) {
  const prompt = await readMarkdownFromModule('./prompt.md', import.meta.url);
  const { isBot } = await checkBotId();
  if (isBot) {
    return NextResponse.json(
      { error: 'Bot is not allowed to access this endpoint' },
      { status: 401 },
    );
  }

  const body = await req.json();
  const parsedBody = linesSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: `Invalid request` }, { status: 400 });
  }

  const result = await generateObject({
    system: prompt,
    model: Models.OpenAIGPT5,
    providerOptions: {
      openai: {
        include: ['reasoning.encrypted_content'],
        reasoningEffort: 'minimal',
        reasoningSummary: 'auto',
        serviceTier: 'priority',
      },
    },
    messages: [{ role: 'user', content: JSON.stringify(parsedBody.data) }],
    schema: resultSchema,
  });

  return NextResponse.json(result.object, {
    status: 200,
  });
}
