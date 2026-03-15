import { createServer } from 'http';
import { URL } from 'url';
import { loadConfig, saveSession, getDefaultApiUrl, saveConfig } from '../config';
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
  // Determine environment
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

  const apiUrl = config.environments[envName].apiUrl;
  const appUrl = getAppUrl(apiUrl);
  const callbackUrl = `http://localhost:${CALLBACK_PORT}/callback`;

  // Build the OAuth sign-in URL
  // better-auth social sign-in redirects through the app's auth proxy
  const signInUrl =
    `${appUrl}/api/auth/sign-in/social?` +
    `provider=google&` +
    `callbackURL=${encodeURIComponent(callbackUrl)}`;

  console.log(`\n\x1b[1mLogging in to ${envName}\x1b[0m (${apiUrl})\n`);
  console.log('Opening browser for authentication...');
  console.log(
    `\x1b[2mIf the browser doesn't open, visit:\x1b[0m\n${signInUrl}\n`,
  );

  // Capture the session token via a local callback server
  const token = await captureToken(signInUrl);

  // Verify the token works by calling the API
  const verifyResponse = await fetch(`${apiUrl}/v1/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!verifyResponse || verifyResponse.status === 401) {
    die('Authentication failed — could not verify session with API.');
  }

  if (verifyResponse.status === 403) {
    die(
      'Login succeeded but your account is not a platform admin.\n' +
        'Ask an existing admin to grant you access.',
    );
  }

  // Extract email from the session (best-effort)
  let email = 'unknown';
  try {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    const meResponse = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meResponse.ok) {
      const data = (await meResponse.json()) as {
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
      const url = new URL(req.url ?? '/', `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname === '/callback') {
        // better-auth sets the session token in cookies on the redirect
        const cookies = req.headers.cookie ?? '';
        const tokenMatch = cookies.match(
          /better-auth\.session_token=([^;]+)/,
        );

        // Also check for token in query params (some flows pass it there)
        const queryToken = url.searchParams.get('token');
        const token = tokenMatch?.[1] ?? queryToken;

        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h2>Login successful!</h2>' +
              '<p>You can close this tab and return to the terminal.</p>' +
              '<script>window.close()</script></body></html>',
          );
          clearTimeout(timeout);
          server.close();
          resolve(token);
        } else {
          // Redirect to the sign-in flow — the callback might be hit
          // before the OAuth flow sets cookies. Redirect to sign-in.
          res.writeHead(302, { Location: signInUrl });
          res.end();
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(CALLBACK_PORT, () => {
      // Open browser
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
