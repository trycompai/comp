import { type GatewayModelId } from '@ai-sdk/gateway';

export enum Models {
  AmazonNovaPro = 'amazon/nova-pro',
  AnthropicClaude4Sonnet = 'anthropic/claude-4-sonnet',
  GoogleGeminiFlash = 'google/gemini-2.5-flash',
  MoonshotKimiK2 = 'moonshotai/kimi-k2',
  OpenAIGPT5 = 'openai/gpt-5',
  OpenAIGPT5Mini = 'openai/gpt-5-mini',
  OpenAIGPT4oMini = 'openai/gpt-4o-mini',
  XaiGrok3Fast = 'xai/grok-3-fast',
}

export const DEFAULT_MODEL = Models.OpenAIGPT5Mini;

export const SUPPORTED_MODELS: GatewayModelId[] = [
  Models.AmazonNovaPro,
  Models.AnthropicClaude4Sonnet,
  Models.GoogleGeminiFlash,
  Models.MoonshotKimiK2,
  Models.OpenAIGPT5,
  Models.OpenAIGPT5Mini,
  Models.OpenAIGPT4oMini,
  Models.XaiGrok3Fast,
];

export const TEST_PROMPTS = [
  'I need an automation that calls github to check if trycompai/comp has dependabot enabled.',
  'Create an automation to list all open issues in a GitHub repository.',
];
