import { timingSafeEqual } from 'crypto';

export interface ServiceDefinition {
  /** Environment variable holding the token */
  envVar: string;
  /** Human-readable name for audit logs */
  name: string;
  /** Allowed 'resource:action' pairs */
  permissions: string[];
}

/**
 * Service definitions for internal service-to-service authentication.
 * Each service gets its own token with explicit scoped permissions.
 */
export const SERVICE_DEFINITIONS: Record<string, ServiceDefinition> = {
  trigger: {
    envVar: 'SERVICE_TOKEN_TRIGGER',
    name: 'Trigger.dev Workers',
    permissions: [
      'integration:read',
      'integration:update',
      'cloud-security:update',
      'vendor:update',
    ],
  },
  portal: {
    envVar: 'SERVICE_TOKEN_PORTAL',
    name: 'Portal App',
    permissions: ['training:read', 'training:update'],
  },
};

/**
 * Resolve which service a token belongs to using timing-safe comparison.
 * Returns the service key and definition, or null if no match.
 */
export function resolveServiceByToken(
  token: string,
): { key: string; definition: ServiceDefinition } | null {
  const tokenBuffer = Buffer.from(token);

  for (const [key, definition] of Object.entries(SERVICE_DEFINITIONS)) {
    const expectedToken = process.env[definition.envVar];
    if (!expectedToken) continue;

    const expectedBuffer = Buffer.from(expectedToken);
    if (
      tokenBuffer.length === expectedBuffer.length &&
      timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      return { key, definition };
    }
  }

  return null;
}

/**
 * Look up a service definition by its key name (e.g., 'trigger', 'portal').
 */
export function resolveServiceByName(
  name: string | undefined,
): ServiceDefinition | null {
  if (!name) return null;
  // Match by human-readable name (stored on request.serviceName)
  for (const definition of Object.values(SERVICE_DEFINITIONS)) {
    if (definition.name === name) return definition;
  }
  return null;
}
