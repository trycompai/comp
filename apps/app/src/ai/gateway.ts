import { createGatewayProvider } from '@ai-sdk/gateway';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { JSONValue } from 'ai';
import { Models } from './constants';

export async function getAvailableModels() {
  const gateway = gatewayInstance();
  const response = await gateway.getAvailableModels();
  return response.models.map((model) => ({ id: model.id, name: model.name }));
}

export interface ModelOptions {
  model: LanguageModelV2;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  headers?: Record<string, string>;
}

export function getModelOptions(
  modelId: string,
  options?: { reasoningEffort?: 'minimal' | 'low' | 'medium' },
): ModelOptions {
  const gateway = gatewayInstance();
  if (modelId === Models.OpenAIGPT5 || modelId === Models.OpenAIGPT5Mini) {
    return {
      model: gateway(modelId),
      providerOptions: {
        openai: {
          include: ['reasoning.encrypted_content'],
          reasoningEffort: options?.reasoningEffort ?? 'low',
          reasoningSummary: 'auto',
          serviceTier: 'priority',
        } satisfies OpenAIResponsesProviderOptions,
      },
    };
  }

  return {
    model: gateway(modelId),
  };
}

function gatewayInstance() {
  return createGatewayProvider({
    baseURL: process.env.AI_GATEWAY_BASE_URL,
  });
}
