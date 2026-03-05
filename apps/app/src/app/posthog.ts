import { Properties } from 'posthog-js';
import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (posthogInstance) {
    return posthogInstance;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (apiKey && apiHost) {
    posthogInstance = new PostHog(apiKey, {
      flushAt: 1,
      flushInterval: 0,
    });
    return posthogInstance;
  }

  return null;
}

// Export the getter function as the primary way to access the client
export { getPostHogClient };

export async function track(distinctId: string, eventName: string, properties?: Properties) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });
}

export async function identify(distinctId: string, properties?: Properties) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

export async function getFeatureFlags(distinctId: string) {
  const client = getPostHogClient();
  if (!client) return {};

  const flags = await client.getAllFlags(distinctId);
  return flags;
}
