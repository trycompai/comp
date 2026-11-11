import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TRUSTED_LINKING_PROVIDERS } from './account-linking-policy';

interface LinkOutcome {
  error: string | null;
  hasSession: boolean;
  linkedAccounts: number;
}

interface LinkScenario {
  trustedProviders: string[];
  providerEmailVerified: boolean;
}

// better-auth is ESM-only; the linking decision runs under Node.
const LINK_SCRIPT = join(
  __dirname,
  '../../test/account-linking/link-with-provider.mjs',
);
const RESULT_MARKER = '__LINK_OUTCOME__';

function runLinkScenarios(linkScenarios: LinkScenario[]): LinkOutcome[] {
  const stdout = execFileSync(
    process.execPath,
    [LINK_SCRIPT, JSON.stringify(linkScenarios)],
    { encoding: 'utf8' },
  );
  const line = stdout
    .split('\n')
    .find((entry) => entry.startsWith(RESULT_MARKER));
  if (!line) throw new Error(`No linking outcome in output: ${stdout}`);
  return JSON.parse(line.slice(RESULT_MARKER.length)) as LinkOutcome[];
}

// The configuration this policy replaces.
const LEGACY_TRUSTED_PROVIDERS = ['google', 'github'];

describe('account linking policy (better-auth behaviour)', () => {
  let configured: LinkOutcome;
  let verified: LinkOutcome;
  let legacyUnverified: LinkOutcome;

  beforeAll(() => {
    [configured, verified, legacyUnverified] = runLinkScenarios([
      // The app's real configuration, provider reports an unverified address.
      {
        trustedProviders: TRUSTED_LINKING_PROVIDERS,
        providerEmailVerified: false,
      },
      // The app's real configuration, provider verified the address.
      {
        trustedProviders: TRUSTED_LINKING_PROVIDERS,
        providerEmailVerified: true,
      },
      // Control: the configuration before this policy existed.
      {
        trustedProviders: LEGACY_TRUSTED_PROVIDERS,
        providerEmailVerified: false,
      },
    ]);
  });

  it('refuses an unverified provider identity for an existing user', () => {
    expect(configured).toEqual({
      error: 'account not linked',
      hasSession: false,
      linkedAccounts: 0,
    });
  });

  it('still links a provider identity the provider verified', () => {
    expect(verified).toEqual({
      error: null,
      hasSession: true,
      linkedAccounts: 1,
    });
  });

  it('links that identity once the provider is trusted (control)', () => {
    expect(legacyUnverified).toEqual({
      error: null,
      hasSession: true,
      linkedAccounts: 1,
    });
  });
});

describe('TRUSTED_LINKING_PROVIDERS', () => {
  it('trusts no provider to carry an unverified address', () => {
    expect(TRUSTED_LINKING_PROVIDERS).toEqual([]);
  });
});

describe('auth.server.ts wiring (structural)', () => {
  const authServer = readFileSync(join(__dirname, 'auth.server.ts'), 'utf-8');

  it('takes the linking policy from account-linking-policy.ts', () => {
    expect(authServer).toContain('trustedProviders: TRUSTED_LINKING_PROVIDERS');
  });

  it('has no inline trusted-provider list', () => {
    expect(authServer).toMatch(/trustedProviders:\s*TRUSTED_LINKING_PROVIDERS/);
    expect(authServer).not.toMatch(/trustedProviders:\s*\[/);
  });
});
