import type {
  BrowserCredentialVaultAdapter,
  RuntimeCredentialMaterial,
} from './credential-vault';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserEvidenceSessionInput } from './browser-evidence-runner.service';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;
type ActivePage = Awaited<
  ReturnType<BrowserbaseSessionService['ensureActivePage']>
>;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drives an automated sign-in using stored credentials. Secret values are passed
 * through Stagehand's `variables` substitution, so they are injected into the page
 * at execution time and are never sent to the model as prompt text.
 */
export async function performCredentialLogin({
  stagehand,
  credentials,
  log,
}: {
  stagehand: Stagehand;
  credentials: RuntimeCredentialMaterial;
  log: (message: string) => void;
}): Promise<void> {
  const variables: Record<string, string> = {};
  if (credentials.username) variables.username = credentials.username;
  if (credentials.password) variables.password = credentials.password;

  // Site-specific fields (workspace, subdomain, …) often precede the password.
  // Values go through variable substitution; only the field labels reach the model.
  const extraFields = credentials.extraFields ?? [];
  if (extraFields.length > 0) {
    const extraVariables: Record<string, string> = {};
    const clauses = extraFields.map((field, index) => {
      extraVariables[`field${index}`] = field.value;
      return `enter %field${index}% into the "${field.label}" field`;
    });
    log('Entering additional login details.');
    await stagehand.act(
      `On the sign-in form, ${clauses.join(', ')}. Then continue if there is a next button.`,
      { variables: extraVariables },
    );
    await delay(1500);
  }

  if (credentials.username || credentials.password) {
    log('Entering stored credentials.');
    await stagehand.act(
      'Enter the username %username% and the password %password% into the sign-in form and submit it. If only one field is visible at a time, fill it and continue to the next step.',
      { variables },
    );
    await delay(2000);
  }

  if (credentials.totpCode) {
    log('Entering one-time passcode.');
    await stagehand.act(
      'If a one-time passcode, two-factor authentication, or verification code field is shown, enter %code% and submit. If no such field is present, do nothing.',
      { variables: { code: credentials.totpCode } },
    );
    await delay(2000);
  }
}

export interface CredentialReloginResult {
  isLoggedIn: boolean;
  page: ActivePage;
  reason?: string;
}

/**
 * Attempts to recover an expired session using credentials stored for the profile.
 * Returns `isLoggedIn: false` (with a reason) when no credentials exist or the
 * automated sign-in couldn't complete — e.g. a login step needs a human (SMS,
 * email code, push approval), which is left to the existing re-auth fallback.
 */
export async function reloginWithStoredCredentials({
  stagehand,
  sessions,
  vault,
  input,
  verifyLoggedIn,
  log,
}: {
  stagehand: Stagehand;
  sessions: BrowserbaseSessionService;
  vault: BrowserCredentialVaultAdapter;
  input: BrowserEvidenceSessionInput;
  verifyLoggedIn: () => Promise<boolean>;
  log: (message: string) => void;
}): Promise<CredentialReloginResult> {
  const resolveCredentials = () =>
    vault.resolveCredentialReference({
      profileId: input.profile.id,
      provider: input.profile.vaultProvider,
      externalItemRef: input.profile.vaultExternalItemRef,
      connectionId: input.profile.vaultConnectionId,
    });

  const credentials = await resolveCredentials();
  let page = await sessions.ensureActivePage(stagehand);

  if (!credentials) {
    return {
      isLoggedIn: false,
      page,
      reason: 'Session expired and no stored credentials are available.',
    };
  }

  page = await runLoginAttempt({
    stagehand,
    sessions,
    credentials,
    input,
    log,
  });
  if (await verifyLoggedIn()) return { isLoggedIn: true, page };

  // Retry once with a freshly resolved TOTP code, which guards against the ~30s
  // rotation boundary landing between resolve and submit.
  if (credentials.totpCode) {
    const fresh = await resolveCredentials();
    if (fresh?.totpCode) {
      page = await runLoginAttempt({
        stagehand,
        sessions,
        credentials: fresh,
        input,
        log,
      });
      if (await verifyLoggedIn()) return { isLoggedIn: true, page };
    }
  }

  return {
    isLoggedIn: false,
    page,
    reason: 'Automated sign-in did not complete; user action may be required.',
  };
}

async function runLoginAttempt({
  stagehand,
  sessions,
  credentials,
  input,
  log,
}: {
  stagehand: Stagehand;
  sessions: BrowserbaseSessionService;
  credentials: RuntimeCredentialMaterial;
  input: BrowserEvidenceSessionInput;
  log: (message: string) => void;
}): Promise<ActivePage> {
  await performCredentialLogin({ stagehand, credentials, log });
  const page = await sessions.ensureActivePage(stagehand);
  // Return to the target URL so the evidence step always starts from the same
  // place, regardless of where the login flow redirected.
  await page.goto(input.targetUrl, {
    waitUntil: 'domcontentloaded',
    timeoutMs: 30000,
  });
  await delay(1500);
  return page;
}
