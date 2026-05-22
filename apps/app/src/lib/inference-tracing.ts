import { setup } from '@inference/tracing';
import { createAISdkTelemetrySettings } from '@inference/tracing/ai-sdk';
import * as ai from 'ai';

type Tracing = Awaited<ReturnType<typeof setup>>;

let tracing: Tracing | null = null;

export async function initTracing(): Promise<void> {
  tracing = await setup({
    serviceName: 'compai-policy-editor',
    modules: { aiSdk: ai },
  });
}

export async function shutdownTracing(): Promise<void> {
  if (!tracing) return;
  await tracing.shutdown();
}

export function getAITelemetry(functionId: string) {
  if (!tracing) return undefined;
  return createAISdkTelemetrySettings(tracing.tracer, { functionId });
}
