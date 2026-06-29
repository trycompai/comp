import * as ai from 'ai';
import { setup, type CatalystTracing } from '@inference/tracing';
import { createAISdkTelemetrySettings } from '@inference/tracing/ai-sdk';

let tracing: CatalystTracing | null = null;

export async function initTracing(): Promise<void> {
  if (!process.env.CATALYST_OTLP_TOKEN) return;

  tracing = await setup({
    serviceName: 'compai-api',
    modules: { aiSdk: ai },
  });

  console.log(
    `Catalyst tracing enabled → ${tracing.endpoint} as ${tracing.serviceName}`,
  );
}

export async function shutdownTracing(): Promise<void> {
  if (!tracing) return;
  await tracing.shutdown();
}

export function getAITelemetry(functionId: string) {
  if (!tracing) return undefined;
  return createAISdkTelemetrySettings(tracing.tracer, { functionId });
}
