import { createInterface } from 'readline';
import {
  loadConfig,
  saveConfig,
  getDefaultApiUrl,
  configPath,
} from '../config';
import { hasFlag } from '../utils';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function initCommand(args: string[]): Promise<void> {
  let envName = 'local';
  if (hasFlag(args, '--staging')) envName = 'staging';
  else if (hasFlag(args, '--production')) envName = 'production';
  else if (hasFlag(args, '--local')) envName = 'local';

  const defaultUrl = getDefaultApiUrl(envName);

  console.log(`\nConfiguring \x1b[1m${envName}\x1b[0m environment\n`);

  const apiUrl =
    (await prompt(`API URL (${defaultUrl}): `)) || defaultUrl;

  const config = loadConfig();
  config.environments[envName] = { apiUrl };
  config.activeEnv = envName;
  saveConfig(config);

  console.log(`\n\x1b[32m✓\x1b[0m Saved to ${configPath()}`);
  console.log(`\x1b[32m✓\x1b[0m Active environment: ${envName}`);
  console.log(`\nRun \x1b[1mcomp login\x1b[0m to authenticate.\n`);
}
