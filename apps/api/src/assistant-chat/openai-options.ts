import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

export const ASSISTANT_OPENAI_PROVIDER_OPTIONS = {
  openai: {
    store: false,
  } satisfies OpenAIResponsesProviderOptions,
};
