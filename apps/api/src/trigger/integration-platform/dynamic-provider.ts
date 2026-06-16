import { db } from '@db';

/**
 * Dynamic (DB-backed) integrations are NOT present in the Trigger.dev runtime's
 * manifest registry: the registry singleton is seeded only with the static code
 * manifests, and the loader that merges DB-backed manifests in
 * (`DynamicManifestLoaderService`) is a NestJS lifecycle service that never runs
 * in the Trigger.dev process. So `getManifest(slug)` returns `undefined` here
 * for dynamic providers, and their checks cannot execute in-process.
 *
 * The fix (mirroring AWS) is to run those checks ON OUR SERVER, where the loader
 * HAS populated the registry — see `runChecksOnServer` and the internal endpoint
 * it calls. These helpers decide when to delegate.
 */

/** True when `slug` is an active DB-backed (dynamic) integration. */
export async function isActiveDynamicProvider(slug: string): Promise<boolean> {
  const row = await db.dynamicIntegration.findUnique({
    where: { slug },
    select: { isActive: true },
  });
  return row?.isActive === true;
}

/**
 * Whether a provider's checks must run on the API server instead of in the
 * Trigger.dev runtime.
 *
 * - AWS → always on the server (its S3 calls must egress our VPC, not
 *   Trigger.dev's, whose endpoint policy blocks the cross-account read).
 * - Has a manifest here → static code integration → run in-process (unchanged).
 * - No manifest but an active dynamic integration → on the server (the manifest
 *   only exists in the API process).
 * - No manifest and not dynamic → unknown provider → do NOT delegate (the caller
 *   surfaces "manifest not found" instead of sending a doomed request).
 *
 * Pure so it can be unit-tested without the DB.
 */
export function shouldRunOnServer(params: {
  providerSlug: string;
  hasManifest: boolean;
  isActiveDynamic: boolean;
}): boolean {
  const { providerSlug, hasManifest, isActiveDynamic } = params;
  if (providerSlug === 'aws') return true;
  if (hasManifest) return false;
  return isActiveDynamic;
}
