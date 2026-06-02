import { describe, expect, it } from 'bun:test';
import { getAllManifests } from '../index';

/**
 * The connections controller derives per-service evidence-task counts with
 * `buildServiceTaskMappings`, which groups checks to a service via
 * `check.service === service.id`. If a manifest defines `services[]` but leaves
 * a check untagged (or tagged with an id that isn't a real service), that
 * check's task silently drops from every service card — exactly the regression
 * cubic flagged for Vercel/Aikido/Google Workspace.
 *
 * Enforce the invariant so a future untagged check fails CI instead of shipping
 * an empty/incorrect per-service task count.
 */
describe('manifest per-service task mapping integrity', () => {
  const manifests = getAllManifests().filter(
    (m) => (m.services?.length ?? 0) > 0 && (m.checks?.length ?? 0) > 0,
  );

  it('covers every service-defining manifest', () => {
    // Guard against the registry import silently returning nothing.
    expect(manifests.length).toBeGreaterThan(0);
  });

  for (const m of manifests) {
    const serviceIds = new Set((m.services ?? []).map((s) => s.id));
    for (const check of m.checks ?? []) {
      it(`${m.id}: check "${check.id}" is tagged with a defined service id`, () => {
        expect(check.service).toBeDefined();
        expect(serviceIds.has(check.service as string)).toBe(true);
      });
    }
  }
});
