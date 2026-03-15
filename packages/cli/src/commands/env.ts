import { loadConfig, saveConfig, configPath } from '../config';
import { die } from '../utils';

export function envCommand(args: string[]): void {
  const config = loadConfig();
  const targetEnv = args[0];

  if (!targetEnv) {
    // Show current environment
    console.log(`Active: \x1b[1m${config.activeEnv}\x1b[0m`);
    const envNames = Object.keys(config.environments);
    if (envNames.length === 0) {
      console.log('No environments configured. Run: comp init');
    } else {
      console.log(`Configured: ${envNames.join(', ')}`);
    }
    return;
  }

  if (!config.environments[targetEnv]) {
    die(`Environment "${targetEnv}" not configured. Run: comp init --${targetEnv}`);
  }

  config.activeEnv = targetEnv;
  saveConfig(config);
  console.log(`\x1b[32m✓\x1b[0m Switched to ${targetEnv} (${configPath()})`);
}
