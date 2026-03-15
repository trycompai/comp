import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface EnvironmentConfig {
  apiUrl: string;
  adminSecret: string;
}

export interface Config {
  activeEnv: string;
  environments: Record<string, EnvironmentConfig>;
}

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
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

export function getActiveEnv(): EnvironmentConfig | null {
  const config = loadConfig();
  return config.environments[config.activeEnv] ?? null;
}

export function getDefaultApiUrl(envName: string): string {
  return DEFAULT_ENVIRONMENTS[envName]?.apiUrl ?? 'http://localhost:3333';
}

export function configPath(): string {
  return CONFIG_PATH;
}
