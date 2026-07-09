import 'server-only';

import { createAzure } from '@ai-sdk/azure';
import { createGatewayProvider } from '@ai-sdk/gateway';
import { openai } from '@ai-sdk/openai';

const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
const azureApiKey = process.env.AZURE_OPENAI_API_KEY?.trim() ?? process.env.AZURE_API_KEY?.trim();
const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() ?? '2024-10-21';
const azureChatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim();
const azureEmbeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT?.trim();

const gateway = createGatewayProvider({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
});

function azureBaseURL(endpoint: string): string {
  const normalized = endpoint.replace(/\/+$/, '');
  return normalized.endsWith('/openai') ? normalized : `${normalized}/openai`;
}

const azureProvider =
  azureEndpoint && azureApiKey
    ? createAzure({
        baseURL: azureBaseURL(azureEndpoint),
        apiKey: azureApiKey,
        apiVersion: azureApiVersion,
        useDeploymentBasedUrls: true,
      })
    : null;

function isGatewayModel(model: string): boolean {
  return model.includes('/');
}

export function isAiConfigured(): boolean {
  return Boolean(azureProvider || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY);
}

export function aiLanguageModel(requestedModel: string) {
  if (azureProvider) {
    return azureProvider.chat(azureChatDeployment ?? requestedModel);
  }

  if (isGatewayModel(requestedModel)) {
    return gateway(requestedModel);
  }

  return openai(requestedModel);
}

export function aiEmbeddingModel(requestedModel: string) {
  if (azureProvider) {
    return azureProvider.embedding(azureEmbeddingDeployment ?? requestedModel);
  }

  return openai.embedding(requestedModel);
}
