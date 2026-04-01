import { Command } from 'commander';
import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import open from 'open';
import {
  getApiUrl,
  getPortalUrl,
  saveCredentials,
  clearCredentials,
  getStoredCredentials,
  getSessionToken,
} from '../lib/config.js';
import { rawApiRequest } from '../lib/api-client.js';
import { handleError, CliError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export function registerAuthCommands(parent: Command): void {
  const auth = parent
    .command('auth')
    .description('Manage authentication. Login via browser to obtain a session token.');

  auth
    .command('login')
    .description(
      'Authenticate with the Comp AI platform. Opens a browser window for login, ' +
        'then stores the session token locally in an encrypted config file. ' +
        'Requires platform admin privileges (user.role = admin).',
    )
    .action(async (_opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await loginAction(cmd.optsWithGlobals().apiUrl as string | undefined, json);
      } catch (error) {
        handleError(error, json);
      }
    });

  auth
    .command('status')
    .description(
      'Check current authentication status. Validates the stored session token ' +
        'against the API and displays user info if authenticated.',
    )
    .action(async (_opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await statusAction(cmd.optsWithGlobals().apiUrl as string | undefined, json);
      } catch (error) {
        handleError(error, json);
      }
    });

  auth
    .command('logout')
    .description('Clear stored credentials and session token from the local config.')
    .action((_opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      clearCredentials();
      outputSuccess('Logged out. Stored credentials have been cleared.', { json });
    });
}

async function loginAction(apiUrlOverride: string | undefined, json: boolean): Promise<void> {
  const apiUrl = getApiUrl(apiUrlOverride);
  const portalUrl = getPortalUrl(apiUrl);
  const state = randomBytes(16).toString('hex');

  let server: Server | null = null;

  try {
    const { port, codePromise, serverInstance } = await startCallbackServer(state);
    server = serverInstance;

    const authUrl = `${portalUrl}/auth?device_auth=true&callback_port=${port}&state=${state}`;

    if (!json) {
      console.log('Opening browser for login...');
      console.log(`If the browser does not open, visit: ${authUrl}`);
    }

    await open(authUrl);

    const code = await codePromise;
    if (!code) {
      throw new CliError('Login timed out or was cancelled. Please try again.');
    }

    const exchangeUrl = `${apiUrl}/v1/device-agent/exchange-code`;
    const response = await fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new CliError(`Code exchange failed (${response.status}). Please try again.`);
    }

    const { session_token, user_id } = (await response.json()) as {
      session_token: string;
      user_id: string;
    };

    saveCredentials(session_token, user_id, apiUrl);
    outputSuccess(`Authenticated successfully (userId: ${user_id}).`, { json });
  } finally {
    if (server) {
      server.closeAllConnections();
      server.close();
    }
  }
}

async function statusAction(apiUrlOverride: string | undefined, json: boolean): Promise<void> {
  const token = getSessionToken();
  if (!token) {
    throw new CliError('Not authenticated. Run `comp-framework auth login` first.');
  }

  const stored = getStoredCredentials();
  const apiUrl = getApiUrl(apiUrlOverride);

  try {
    const session = await rawApiRequest<{
      user?: { id: string; email: string; name: string; role: string };
    }>('/api/auth/get-session', { apiUrl });

    outputResult(
      {
        authenticated: true,
        user: session.user ?? null,
        apiUrl: stored?.apiUrl ?? apiUrl,
        source: process.env['COMP_SESSION_TOKEN'] ? 'environment' : 'config',
      },
      { json },
    );
  } catch {
    throw new CliError(
      'Session is invalid or expired. Run `comp-framework auth login` to re-authenticate.',
    );
  }
}

function startCallbackServer(
  expectedState: string,
): Promise<{ port: number; codePromise: Promise<string | null>; serverInstance: Server }> {
  return new Promise((resolveSetup, rejectSetup) => {
    let resolveCode: (code: string | null) => void;
    let timeoutId: NodeJS.Timeout;

    const codePromise = new Promise<string | null>((resolve) => {
      resolveCode = (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      };
    });

    const server = createServer((req, res) => {
      res.setHeader('Connection', 'close');
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname !== '/auth-callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(htmlPage('Sign-in failed', 'Invalid state parameter. Please try again.'));
        resolveCode(null);
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(htmlPage('Sign-in failed', 'Missing authorization code. Please try again.'));
        resolveCode(null);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        htmlPage('Sign-in complete!', 'You can close this tab and return to the terminal.'),
      );
      resolveCode(code);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        rejectSetup(new Error('Failed to get server address'));
        return;
      }
      resolveSetup({ port: addr.port, codePromise, serverInstance: server });
    });

    server.on('error', (err) => rejectSetup(err));

    timeoutId = setTimeout(() => resolveCode(null), LOGIN_TIMEOUT_MS);
  });
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html><html><head><title>Comp AI CLI</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#fafafa;">
<div style="text-align:center;padding:2rem;">
<h2 style="color:#111;margin-bottom:0.5rem;">${title}</h2>
<p style="color:#666;">${message}</p>
</div></body></html>`;
}
