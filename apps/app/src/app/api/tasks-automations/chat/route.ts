import { DEFAULT_MODEL } from '@/ai/constants';
import { getAvailableModels, getModelOptions } from '@/ai/gateway';
import { getTaskAutomationTools } from '@/ai/tools/task-automation-tools';
import { db } from '@db';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';
import { type ChatUIMessage } from '../../../(app)/[orgId]/tasks/[taskId]/automation/components/chat/types';
import automationPrompt from './automation-prompt.md';
import lambdaPrompt from './prompt.md';

interface BodyData {
  messages: ChatUIMessage[];
  modelId?: string;
  reasoningEffort?: 'low' | 'medium';
  orgId: string;
  taskId: string;
}

export async function POST(req: Request) {
  const { isBot } = await checkBotId();
  if (isBot) {
    return NextResponse.json(
      { error: 'Bot is not allowed to access this endpoint' },
      { status: 401 },
    );
  }

  const [models, { messages, modelId = DEFAULT_MODEL, reasoningEffort, orgId, taskId }] =
    await Promise.all([getAvailableModels(), req.json() as Promise<BodyData>]);

  const model = models.find((model) => model.id === modelId);
  if (!model) {
    return NextResponse.json({ error: `Model ${modelId} not found.` }, { status: 400 });
  }

  // Validate required parameters
  if (!orgId || !taskId) {
    return NextResponse.json(
      { error: 'Missing required parameters: orgId and taskId' },
      { status: 400 },
    );
  }

  // Fetch available integrations and their secrets
  // Get all configured secrets for the organization
  const secrets = await db.secret.findMany({
    where: {
      organizationId: orgId,
    },
    select: {
      name: true,
      category: true,
      description: true,
    },
  });

  // Build list of available secret names
  const availableSecrets = secrets.map((s) => s.name);

  const actualValuesJson = JSON.stringify({
    ORG_ID: orgId,
    TASK_ID: taskId,
    AVAILABLE_SECRETS: availableSecrets,
  });
  // Include Lambda prompt content.
  // markdown loaded via webpack asset/source (string)
  const fullPromptContext = `\n${lambdaPrompt}\n\n---\n`;

  const prompt = `${automationPrompt}\n\nFULL_PROMPT_CONTEXT:\n${fullPromptContext}\n\nACTUAL_VALUES_JSON:\n${actualValuesJson}`;

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: ({ writer }) => {
        const result = streamText({
          ...getModelOptions(modelId, { reasoningEffort }),
          system: prompt,
          messages: convertToModelMessages(
            messages.map((message) => {
              message.parts = message.parts.map((part) => {
                if (part.type === 'data-report-errors') {
                  return {
                    type: 'text',
                    text:
                      `There are errors in the generated code. This is the summary of the errors we have:\n` +
                      `\`\`\`${part.data.summary}\`\`\`\n` +
                      (part.data.paths?.length
                        ? `The following files may contain errors:\n` +
                          `\`\`\`${part.data.paths?.join('\n')}\`\`\`\n`
                        : '') +
                      `Fix the errors reported.`,
                  };
                }
                return part;
              });
              return message;
            }),
          ),
          stopWhen: stepCountIs(20),
          tools: getTaskAutomationTools({ writer, modelId }),
          onError: (error) => {
            console.error('Error communicating with AI');
            console.error(JSON.stringify(error, null, 2));
          },
        });
        result.consumeStream();
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            sendStart: false,
            messageMetadata: () => ({
              model: model.name,
            }),
          }),
        );
      },
    }),
  });
}
