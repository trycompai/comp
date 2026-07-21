import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression test for CS-764.
 *
 * The published ESET Protect setup instructions referenced "More > Users > API
 * Users", a path that no longer exists in the ESET PROTECT console. More
 * importantly, the only option that path now exposes ("New Mapped Account")
 * creates a console login with NO API ("Integrations") access, so every check
 * was denied. API access has to be granted to a user in ESET PROTECT Hub (or
 * ESET Business Account) by enabling the "Integrations" toggle. These
 * assertions pin the customer-facing instructions to that current flow.
 */
describe('ESET Protect catalog setup instructions (CS-764)', () => {
  const catalog = JSON.parse(
    readFileSync(join(import.meta.dir, '..', 'integrations', 'eset-protect.json'), 'utf8'),
  ) as { authConfig: { config: { setupInstructions: string } } };
  const setupInstructions = catalog.authConfig.config.setupInstructions;

  it('does not reference the outdated "More > Users" console path', () => {
    expect(setupInstructions).not.toContain('More > Users');
  });

  it('directs users to ESET PROTECT Hub / ESET Business Account for the API user', () => {
    expect(setupInstructions).toContain('ESET PROTECT Hub');
    expect(setupInstructions).toContain('ESET Business Account');
  });

  it('tells users to enable the "Integrations" API-access toggle', () => {
    expect(setupInstructions).toContain('Integrations');
  });

  it('warns that the "New Mapped Account" console option does not grant API access', () => {
    expect(setupInstructions).toContain('New Mapped Account');
  });
});
