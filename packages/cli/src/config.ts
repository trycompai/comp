import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface SessionInfo {
  token: string;
  expiresAt: string;
  email: string;
}

export interface EnvironmentConfig {
  apiUrl: string;
  session?: SessionInfo;
}

export interface Config {
  activeEnv: string;
  environments: Record<string, EnvironmentConfig>;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const CONFIG_PATH = join(homedir(), '.comprc');

const DEFAULT_ENVIRONMENTS: Record<string, { apiUrl: string }> = {
  local: { apiUrl: 'http://localhost:3333' },
  staging: { apiUrl: 'https://staging-api.trycomp.ai' },
  production: { apiUrl: 'https://api.trycomp.ai' },
};

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return { activeEnv: 'local', environments: {} };
  }

  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
  });
  chmodSync(CONFIG_PATH, 0o600);
}

export function getActiveEnv(): EnvironmentConfig | null {
  const config = loadConfig();
  return config.environments[config.activeEnv] ?? null;
}

export function getActiveSession(): SessionInfo | null {
  const env = getActiveEnv();
  if (!env?.session) return null;

  const expiresAt = new Date(env.session.expiresAt);
  if (expiresAt <= new Date()) {
    return null; // expired
  }

  return env.session;
}

export function saveSession({
  token,
  email,
}: {
  token: string;
  email: string;
}): void {
  const config = loadConfig();
  const envName = config.activeEnv;

  if (!config.environments[envName]) {
    config.environments[envName] = {
      apiUrl: getDefaultApiUrl(envName),
    };
  }

  config.environments[envName].session = {
    token,
    email,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  saveConfig(config);
}

export function clearSession(): void {
  const config = loadConfig();
  const env = config.environments[config.activeEnv];
  if (env) {
    delete env.session;
    saveConfig(config);
  }
}

export function getDefaultApiUrl(envName: string): string {
  return DEFAULT_ENVIRONMENTS[envName]?.apiUrl ?? 'http://localhost:3333';
}

export function configPath(): string {
  return CONFIG_PATH;
}

export function sessionTtlMs(): number {
  return SESSION_TTL_MS;
}
