'use server';

import type { Properties } from 'posthog-js';
import { PostHog } from 'posthog-node';

let serverInstance: PostHog | null = null;

interface AnalyticsConfig {
  apiKey: string;
  apiHost: string;
}

export async function initializeServer(config: AnalyticsConfig) {
  if (!serverInstance) {
    serverInstance = new PostHog(config.apiKey, {
      host: config.apiHost,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return serverInstance;
}

export async function track(distinctId: string, eventName: string, properties?: Properties) {
  if (!serverInstance) return;

  await serverInstance.capture({
    distinctId,
    event: eventName,
    properties,
  });
  await serverInstance.flush();
}

export async function identify(distinctId: string, properties?: Properties) {
  if (!serverInstance) return;

  await serverInstance.identify({
    distinctId,
    properties,
  });
  await serverInstance.flush();
}

export async function getFeatureFlags(distinctId: string): Promise<Record<string, boolean | string>> {
  if (!serverInstance) return {};

  const flags = await serverInstance.getAllFlags(distinctId);
  await serverInstance.flush();
  return flags;
}
