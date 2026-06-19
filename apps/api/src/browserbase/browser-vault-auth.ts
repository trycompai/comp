import type { RuntimeCredentialMaterial } from './credential-vault';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const STAGEHAND_CUA_MODEL = 'anthropic/claude-sonnet-4-6';

const hasUsableCredential = (credentials: RuntimeCredentialMaterial): boolean =>
  Boolean(credentials.username || credentials.password || credentials.totpCode);

export async function attemptVaultBackedSignIn({
  stagehand,
  credentials,
}: {
  stagehand: Stagehand;
  credentials: RuntimeCredentialMaterial;
}): Promise<boolean> {
  if (!hasUsableCredential(credentials)) return false;

  const credentialLines = [
    credentials.username ? `Username: ${credentials.username}` : null,
    credentials.password ? `Password: ${credentials.password}` : null,
    credentials.totpCode ? `One-time code: ${credentials.totpCode}` : null,
  ].filter((line): line is string => Boolean(line));

  await stagehand
    .agent({
      cua: true,
      model: {
        modelName: STAGEHAND_CUA_MODEL,
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    })
    .execute({
      instruction: [
        'Sign in to this website using only these runtime credentials.',
        ...credentialLines,
        'After sign-in completes, stop and wait.',
      ].join('\n'),
      maxSteps: 12,
    });

  return true;
}
