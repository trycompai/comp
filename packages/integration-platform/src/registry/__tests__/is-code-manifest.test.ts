import { afterEach, describe, expect, it } from 'bun:test';
import type { IntegrationManifest } from '../../types';
import { getManifest, isCodeManifest, registry } from '../index';

/**
 * CS-715 regression guard.
 *
 * The manual "Run a check" path classifies a run as dynamic (→ held as an
 * 'inconclusive', customer-hidden result handed to the self-heal agent) vs static
 * (→ a plain failed/pass shown to the customer). Several providers ship a
 * code-based manifest AND an active DynamicIntegration row of the same slug (the
 * latter only for extra DB-backed checks, e.g. GitHub's Code Changes / Employee
 * Access). Because a code manifest always WINS in the registry, the check that
 * actually runs is the code one and must be treated as static.
 *
 * Keying "is this dynamic?" off "does a DynamicIntegration row exist for the
 * slug?" hid every code-based finding (e.g. Dependabot) from the manual run.
 * `isCodeManifest` is the authoritative signal callers must use instead.
 */
describe('isCodeManifest', () => {
  it('returns true for every bundled (code) manifest', () => {
    // Every id the registry loaded from code must report as a code manifest.
    for (const manifest of registry.getAllManifests()) {
      expect(isCodeManifest(manifest.id)).toBe(true);
    }
  });

  it('returns true for known code-based providers that also have dynamic rows', () => {
    // These four ship a code manifest AND (in prod) an active DynamicIntegration
    // row of the same slug — exactly the CS-715 case. They must stay code.
    for (const slug of ['github', 'vercel', 'aikido', 'rippling']) {
      expect(isCodeManifest(slug)).toBe(true);
    }
  });

  it('returns false for an unknown slug', () => {
    expect(isCodeManifest('definitely-not-a-real-provider')).toBe(false);
  });

  describe('with a dynamic manifest registered', () => {
    const DYNAMIC_ONLY_ID = 'cs715-dynamic-only-fixture';

    afterEach(() => {
      registry.unregisterDynamic(DYNAMIC_ONLY_ID);
    });

    it('treats a dynamic-only manifest (no code counterpart) as NOT a code manifest', () => {
      const dynamic: IntegrationManifest = {
        id: DYNAMIC_ONLY_ID,
        name: 'CS715 Dynamic Only',
        auth: { type: 'custom', config: {} },
        capabilities: ['checks'],
      } as unknown as IntegrationManifest;

      registry.registerDynamic(dynamic);

      // Resolvable as a manifest (so a run can execute it)...
      expect(getManifest(DYNAMIC_ONLY_ID)).toBeDefined();
      // ...but NOT a code manifest, so it is correctly classified dynamic.
      expect(isCodeManifest(DYNAMIC_ONLY_ID)).toBe(false);
    });

    it('a dynamic registration cannot override a code manifest of the same id', () => {
      // registerDynamic is a no-op for a code id, so github stays code — the
      // core CS-715 invariant.
      registry.registerDynamic({
        id: 'github',
        name: 'Shadow GitHub',
        auth: { type: 'custom', config: {} },
        capabilities: ['checks'],
      } as unknown as IntegrationManifest);

      expect(isCodeManifest('github')).toBe(true);
    });
  });
});
