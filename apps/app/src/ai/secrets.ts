// Central registry for standard secrets used by automations and tools.
// AI-friendly design: a flat list with simple fields and helper lookups.

export type SecretProvider = 'github';

export interface SecretEntry {
  id: string; // stable identifier, e.g. 'github.token'
  provider: SecretProvider;
  name: string; // short name within provider, e.g. 'token'
  envVar: string; // environment variable name, e.g. 'GITHUB_TOKEN'
  description: string;
  required: boolean;
  docsUrl?: string;
  aliases?: readonly string[]; // additional phrases an AI/user might use
}

export const SECRETS: readonly SecretEntry[] = [
  {
    id: 'github.token',
    provider: 'github',
    name: 'token',
    envVar: 'GITHUB_TOKEN',
    description:
      'GitHub token (PAT or App installation token) with read access to repository contents and metadata.',
    required: true,
    docsUrl:
      'https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    aliases: ['github token', 'gh token', 'github_pat', 'github personal access token'],
  },
] as const;

// Lightweight indexes for fast lookup
const SECRET_BY_ID: Readonly<Record<string, SecretEntry>> = Object.freeze(
  Object.fromEntries(SECRETS.map((s) => [s.id, s])),
);

const SECRET_BY_ENV: Readonly<Record<string, SecretEntry>> = Object.freeze(
  Object.fromEntries(SECRETS.map((s) => [s.envVar.toUpperCase(), s])),
);

export function listSecrets(): readonly SecretEntry[] {
  return SECRETS;
}

export function listProviderSecrets(provider: SecretProvider): readonly SecretEntry[] {
  return SECRETS.filter((s) => s.provider === provider);
}

export function getSecretById(id: string): SecretEntry | undefined {
  return SECRET_BY_ID[id];
}

export function getSecretByEnvVar(envVar: string): SecretEntry | undefined {
  return SECRET_BY_ENV[envVar.toUpperCase()];
}

export function getEnvVarNameById(id: string): string | undefined {
  return getSecretById(id)?.envVar;
}

// Flexible resolver that accepts: id, env var, provider.name, or an alias phrase
export function resolveSecretIdentifier(identifier: string): SecretEntry | undefined {
  const raw = identifier.trim();
  if (!raw) return undefined;

  // Exact id
  const byId = getSecretById(raw);
  if (byId) return byId;

  // Exact env var
  const byEnv = getSecretByEnvVar(raw);
  if (byEnv) return byEnv;

  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  // provider.name form
  const dotIdx = normalized.indexOf('.');
  if (dotIdx > 0) {
    const provider = normalized.slice(0, dotIdx);
    const name = normalized.slice(dotIdx + 1);
    const match = SECRETS.find(
      (s) => s.provider === (provider as SecretProvider) && s.name.toLowerCase() === name,
    );
    if (match) return match;
  }

  // Alias match
  const byAlias = SECRETS.find((s) =>
    (s.aliases ?? []).some((a) => a.toLowerCase() === normalized),
  );
  if (byAlias) return byAlias;

  // Provider-keyword fallback: e.g., 'github token'
  const byTokens = SECRETS.find(
    (s) => normalized.includes(s.provider) && normalized.includes(s.name.toLowerCase()),
  );
  return byTokens;
}
