import {
  performCredentialLogin,
  type CredentialLoginTarget,
} from './browser-credential-login';
import { expectedOriginOf } from './browser-expected-origin';
import {
  classifyLoginOutcome,
  type SignInOutcome,
} from './browser-login-classifier';
import type { BrowserCredentialVaultAdapter } from './credential-vault';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

/**
 * The connect flow's first sign-in: fill the stored credentials and classify
 * where we land. Unlike reloginWithStoredCredentials (used by the scheduler),
 * this does NOT navigate back to the target afterward — the post-submit page is
 * exactly what we need to classify (an error, a 2FA prompt, a challenge, or a
 * signed-in dashboard).
 */
export async function signInAndClassify({
  stagehand,
  vault,
  input,
  log,
  usernameLabel,
}: {
  stagehand: Stagehand;
  vault: BrowserCredentialVaultAdapter;
  input: CredentialLoginTarget;
  log: (message: string) => void;
  /** Vendor's identifier-field label, for a truthful streamed step. */
  usernameLabel?: string;
}): Promise<{ outcome: SignInOutcome }> {
  const resolveCredentials = () =>
    vault.resolveCredentialReference({
      profileId: input.profile.id,
      provider: input.profile.vaultProvider,
      externalItemRef: input.profile.vaultExternalItemRef,
      connectionId: input.profile.vaultConnectionId,
    });

  const credentials = await resolveCredentials();
  if (!credentials) return { outcome: 'unknown' };

  const expectedOrigin = expectedOriginOf(input.profile.hostname);
  await performCredentialLogin({
    stagehand,
    credentials,
    log,
    usernameLabel,
    expectedOrigin,
  });
  let outcome = await classifyLoginOutcome(stagehand);

  // A 2FA prompt still showing with a stored seed can mean the code landed on
  // the ~30s rotation boundary — retry once with a freshly generated code.
  if (outcome === 'needs_2fa' && credentials.totpCode) {
    const fresh = await resolveCredentials();
    if (fresh?.totpCode) {
      await performCredentialLogin({
        stagehand,
        credentials: fresh,
        log,
        usernameLabel,
        expectedOrigin,
      });
      outcome = await classifyLoginOutcome(stagehand);
    }
  }

  return { outcome };
}
