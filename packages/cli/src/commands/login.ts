import { createServer } from 'http';
import { URL } from 'url';
import {
  loadConfig,
  saveSession,
  getDefaultApiUrl,
  saveConfig,
} from '../config';
import { die, hasFlag } from '../utils';

const CALLBACK_PORT = 8417;
const LOGIN_TIMEOUT_MS = 120_000; // 2 minutes

function getAppUrl(apiUrl: string): string {
  if (apiUrl.includes('localhost:3333')) return 'http://localhost:3000';
  if (apiUrl.includes('staging-api.trycomp.ai'))
    return 'https://app.staging.trycomp.ai';
  return 'https://app.trycomp.ai';
}

export async function loginCommand(args: string[]): Promise<void> {
  let envName = 'local';
  if (hasFlag(args, '--staging')) envName = 'staging';
  else if (hasFlag(args, '--production')) envName = 'production';
  else if (hasFlag(args, '--local')) envName = 'local';

  const config = loadConfig();

  if (!config.environments[envName]) {
    config.environments[envName] = { apiUrl: getDefaultApiUrl(envName) };
  }
  config.activeEnv = envName;
  saveConfig(config);

  const envConfig = config.environments[envName];
  if (!envConfig) die(`Environment "${envName}" not configured.`);
  const apiUrl = envConfig.apiUrl;
  const appUrl = getAppUrl(apiUrl);

  // After OAuth, better-auth redirects to this app route which relays
  // the session token to our local server via localhost redirect.
  const cliCallbackPath = `/api/cli/callback?port=${CALLBACK_PORT}`;

  // better-auth social sign-in with callbackURL pointing to our relay
  const signInUrl =
    `${appUrl}/api/auth/sign-in/social?` +
    `provider=google&` +
    `callbackURL=${encodeURIComponent(cliCallbackPath)}`;

  console.log(`\n\x1b[1mLogging in to ${envName}\x1b[0m (${apiUrl})\n`);
  console.log('Opening browser for authentication...');
  console.log(
    `\x1b[2mIf the browser doesn't open, visit:\x1b[0m\n${signInUrl}\n`,
  );

  const token = await captureToken(signInUrl);

  // Verify the token works against the admin API
  let verifyResponse: Response | null = null;
  try {
    verifyResponse = await fetch(`${apiUrl}/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // API might not be reachable — we still have a valid session
  }

  if (verifyResponse?.status === 403) {
    die(
      'Login succeeded but your account is not a platform admin.\n' +
        'Ask an existing admin to grant you access.',
    );
  }

  // Resolve email from the session
  let email = 'unknown';
  try {
    const sessionRes = await fetch(
      `${appUrl}/api/auth/get-session`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (sessionRes.ok) {
      const data = (await sessionRes.json()) as {
        user?: { email?: string };
      };
      if (data.user?.email) email = data.user.email;
    }
  } catch {
    // non-critical
  }

  saveSession({ token, email });

  console.log(`\x1b[32m✓\x1b[0m Logged in as \x1b[1m${email}\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Session expires in 1 hour\n`);
}

function captureToken(signInUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out after 2 minutes'));
    }, LOGIN_TIMEOUT_MS);

    const server = createServer((req, res) => {
      const url = new URL(
        req.url ?? '/',
        `http://localhost:${CALLBACK_PORT}`,
      );

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');

        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body style="font-family:system-ui;text-align:center;padding:60px">' +
              '<h2>Login successful!</h2>' +
              '<p>You can close this tab and return to the terminal.</p>' +
              '<script>window.close()</script></body></html>',
          );
          clearTimeout(timeout);
          server.close();
          resolve(token);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body style="font-family:system-ui;text-align:center;padding:60px">' +
              '<h2>Login failed</h2>' +
              '<p>No session token received. Please try again.</p></body></html>',
          );
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(CALLBACK_PORT, () => {
      const openCmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';

      import('child_process').then(({ exec }) => {
        exec(`${openCmd} "${signInUrl}"`);
      });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${CALLBACK_PORT} is in use. Close the process using it and try again.`,
          ),
        );
      } else {
        reject(err);
      }
    });
  });
}
