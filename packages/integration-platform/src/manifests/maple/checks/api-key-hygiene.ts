import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { daysBetween, failMapleRequest, listAll, requireMapleBaseUrl } from '../api';
import type { MapleApiKey } from '../types';
import {
  maxFullAccessAgeDaysVariable,
  maxUnusedDaysVariable,
  parseMaxFullAccessAgeDays,
  parseMaxUnusedDays,
} from '../variables';

/**
 * Maple API Key Hygiene Check
 *
 * Verifies that active Maple API keys are in use and that keys without scope
 * restrictions are rotated regularly.
 * Maps to: Secure Secrets task
 */
export const apiKeyHygieneCheck: IntegrationCheck = {
  id: 'api-key-hygiene',
  name: 'API Keys Are Used and Rotated',
  description:
    'Verify active Maple API keys have been used recently and full-access keys are rotated',
  service: 'access',
  taskMapping: TASK_TEMPLATES.secureSecrets,
  defaultSeverity: 'medium',
  variables: [maxUnusedDaysVariable, maxFullAccessAgeDaysVariable],

  run: async (ctx: CheckContext) => {
    const baseUrl = requireMapleBaseUrl(ctx);
    if (!baseUrl) return;

    const maxUnusedDays = parseMaxUnusedDays(ctx.variables);
    const maxFullAccessAgeDays = parseMaxFullAccessAgeDays(ctx.variables);
    const now = new Date();

    ctx.log('Fetching Maple API keys');
    let keys: MapleApiKey[];
    try {
      keys = await listAll<MapleApiKey>(ctx, { baseUrl, path: '/v2/api_keys' });
    } catch (error) {
      failMapleRequest(ctx, { error, resource: 'API keys', scope: 'api_keys:read' });
      return;
    }

    const activeKeys = keys.filter(
      (key) => !key.revoked && !(key.expires_at && new Date(key.expires_at) <= now),
    );
    ctx.log(`Reviewing ${activeKeys.length} active keys (${keys.length} total)`);

    for (const key of activeKeys) {
      const lastActivity = new Date(key.last_used_at ?? key.created_at);
      const idleDays = daysBetween(lastActivity, now);
      const ageDays = daysBetween(new Date(key.created_at), now);
      const fullAccess = key.scopes === null || key.scopes.includes('*');
      const evidence = {
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        kind: key.kind,
        scopes: key.scopes ?? 'full access',
        createdAt: key.created_at,
        createdBy: key.created_by_email,
        lastUsedAt: key.last_used_at,
        expiresAt: key.expires_at,
        idleDays,
        ageDays,
      };

      if (idleDays > maxUnusedDays) {
        ctx.fail({
          title: `API key "${key.name}" is unused`,
          resourceType: 'api_key',
          resourceId: key.id,
          severity: 'medium',
          description: key.last_used_at
            ? `This key was last used ${idleDays} days ago (limit: ${maxUnusedDays}).`
            : `This key was created ${idleDays} days ago and has never been used (limit: ${maxUnusedDays}).`,
          remediation: `In Maple, open Settings → API Keys and revoke "${key.name}" (${key.key_prefix}…) if nothing depends on it.`,
          evidence,
        });
        continue;
      }

      if (fullAccess && ageDays > maxFullAccessAgeDays) {
        ctx.fail({
          title: `Full-access API key "${key.name}" is not rotated`,
          resourceType: 'api_key',
          resourceId: key.id,
          severity: 'medium',
          description: `This key has no scope restrictions and is ${ageDays} days old (limit: ${maxFullAccessAgeDays}).`,
          remediation: `In Maple, open Settings → API Keys and roll "${key.name}", or replace it with a key limited to the scopes it needs.`,
          evidence,
        });
        continue;
      }

      ctx.pass({
        title: `API key "${key.name}" is in use`,
        resourceType: 'api_key',
        resourceId: key.id,
        description: fullAccess
          ? `Full-access key, ${ageDays} days old, last used ${idleDays} days ago.`
          : `Scoped to ${key.scopes?.join(', ')}, last used ${idleDays} days ago.`,
        evidence,
      });
    }

    ctx.pass({
      title: 'Maple API key inventory',
      resourceType: 'maple',
      resourceId: 'api-keys-summary',
      description: `${activeKeys.length} active keys, ${keys.length - activeKeys.length} revoked or expired.`,
      evidence: {
        reviewedAt: now.toISOString(),
        maxUnusedDays,
        maxFullAccessAgeDays,
        activeKeys: activeKeys.length,
        fullAccessKeys: activeKeys.filter((k) => k.scopes === null || k.scopes.includes('*'))
          .length,
      },
    });
  },
};
