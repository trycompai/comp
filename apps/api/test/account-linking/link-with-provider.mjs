// Drives better-auth's account-linking decision for each scenario in argv[2]
// and prints the outcomes as JSON. better-auth is ESM-only, so the spec runs
// this under Node instead of importing it.
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { handleOAuthUserInfo } from 'better-auth/oauth2';

const RESULT_MARKER = '__LINK_OUTCOME__';
const VICTIM_EMAIL = 'victim@example.com';
const PROVIDER_ID = 'google';
const PROVIDER_ACCOUNT_ID = 'attacker-google-subject';

async function runScenario({ trustedProviders, providerEmailVerified }) {
  const auth = betterAuth({
    secret: 'account-linking-check-secret-0000000000',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter({
      user: [],
      account: [],
      session: [],
      verification: [],
    }),
    account: { accountLinking: { enabled: true, trustedProviders } },
  });

  const context = await auth.$context;
  const localUser = await context.internalAdapter.createUser({
    email: VICTIM_EMAIL,
    emailVerified: true,
    name: 'Existing User',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const result = await handleOAuthUserInfo(
    { context },
    {
      userInfo: {
        id: PROVIDER_ACCOUNT_ID,
        email: VICTIM_EMAIL,
        emailVerified: providerEmailVerified,
        name: 'Attacker',
      },
      account: { providerId: PROVIDER_ID, accountId: PROVIDER_ACCOUNT_ID },
      callbackURL: '/',
    },
  );

  const accounts = await context.internalAdapter.findAccounts(localUser.id);

  return {
    error: result.error ?? null,
    hasSession: Boolean(result.data?.session),
    linkedAccounts: accounts.length,
  };
}

const scenarios = JSON.parse(process.argv[2]);
const outcomes = [];
for (const scenario of scenarios) {
  outcomes.push(await runScenario(scenario));
}

process.stdout.write(`${RESULT_MARKER}${JSON.stringify(outcomes)}\n`);
