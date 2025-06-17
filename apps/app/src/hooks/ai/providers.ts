import { groq } from '@ai-sdk/groq';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';

export const model = customProvider({
  languageModels: {
    'deepseek-r1-distill-llama-70b': wrapLanguageModel({
      middleware: extractReasoningMiddleware({
        tagName: 'think',
      }),
      model: groq('deepseek-r1-distill-llama-70b'),
    }),
  },
});

export type modelID = Parameters<(typeof model)['languageModel']>['0'];
