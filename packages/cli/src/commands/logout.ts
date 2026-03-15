import { clearSession, loadConfig } from '../config';

export function logoutCommand(): void {
  const config = loadConfig();
  const env = config.environments[config.activeEnv];

  if (!env?.session) {
    console.log('Not logged in.');
    return;
  }

  const email = env.session.email;
  clearSession();
  console.log(`\x1b[32m✓\x1b[0m Logged out ${email} from ${config.activeEnv}`);
}
