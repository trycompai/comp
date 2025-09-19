import { DEFAULT_MODEL } from '@/ai/constants';
import { getAvailableModels, getModelOptions } from '@/ai/gateway';
import { listSecrets } from '@/ai/secrets';
import { tools } from '@/ai/tools';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';
import { type ChatUIMessage } from '../../../(app)/[orgId]/tasks/[taskId]/automations/components/chat/types';
import automationPrompt from './automation-prompt.md';
import lambdaPrompt from './prompt.md';

interface BodyData {
  messages: ChatUIMessage[];
  modelId?: string;
  reasoningEffort?: 'low' | 'medium';
}

export async function POST(req: Request) {
  const checkResult = await checkBotId();
  if (checkResult.isBot) {
    return NextResponse.json({ error: `Bot detected` }, { status: 403 });
  }

  const [models, { messages, modelId = DEFAULT_MODEL, reasoningEffort }] = await Promise.all([
    getAvailableModels(),
    req.json() as Promise<BodyData>,
  ]);

  const model = models.find((model) => model.id === modelId);
  if (!model) {
    return NextResponse.json({ error: `Model ${modelId} not found.` }, { status: 400 });
  }

  // Compose system prompt with available secrets injected as JSON for the model.
  const availableSecretsJson = JSON.stringify(
    listSecrets().map((s) => ({
      id: s.id,
      provider: s.provider,
      name: s.name,
      envVar: s.envVar,
      required: s.required,
    })),
  );
  const testConstantsJson = JSON.stringify({
    ORG_ID: 'org_689ce3dced87cc45f600a04b',
    TASK_ID: 'tsk_689ce3dd6f19f4cf1f0ea061',
  });
  // Include Lambda prompt content.
  const fullPromptContext = `
${lambdaPrompt}

---
`;

  const prompt = `${automationPrompt}\n\nFULL_PROMPT_CONTEXT:\n${fullPromptContext}\n\nAVAILABLE_SECRETS_JSON:\n${availableSecretsJson}\n\nTEST_CONSTANTS_JSON:\n${testConstantsJson}`;

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
          tools: tools({ writer, modelId }),
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
