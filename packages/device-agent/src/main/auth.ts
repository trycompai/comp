import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { dialog, shell } from 'electron';
import { AGENT_VERSION, API_ROUTES } from '../shared/constants';
import type {
  DeviceInfo,
  MyOrganizationsResponse,
  OrgRegistration,
  RegisterDeviceResponse,
  StoredAuth,
} from '../shared/types';
import { log } from './logger';
import { clearAuth, getApiUrl, getPortalUrl, setAuth } from './store';

/** How long to wait for the user to complete login in the browser */
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Opens the system browser for login, receives an auth code via localhost callback,
 * exchanges it for a session token, then registers the device for all organizations.
 */
export async function performLogin(deviceInfo: DeviceInfo): Promise<StoredAuth | null> {
  const portalUrl = getPortalUrl();
  const apiUrl = getApiUrl();
  const state = randomBytes(16).toString('hex');

  let server: Server | null = null;

  try {
    // Start a temporary localhost server to receive the auth callback
    const { port, codePromise, serverInstance } = await startCallbackServer(state);
    server = serverInstance;

    // Open the portal auth page in the system browser
    const authUrl = `${portalUrl}/auth?device_auth=true&callback_port=${port}&state=${state}`;
    log(`Opening system browser for login: ${authUrl}`);
    await shell.openExternal(authUrl);

    // Wait for the auth code from the browser redirect
    log('Waiting for auth callback from browser...');
    const code = await codePromise;

    if (!code) {
      log('Login timed out or was cancelled', 'WARN');
      return null;
    }

    log('Received auth code, exchanging for session token...');

    // Exchange the code for a session token (calls the NestJS API)
    const exchangeResponse = await fetch(`${apiUrl}${API_ROUTES.EXCHANGE_CODE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      log(`Code exchange failed: ${exchangeResponse.status} - ${errorText}`, 'ERROR');
      dialog.showMessageBoxSync({
        type: 'error',
        title: 'Sign-In Failed',
        message: 'Could not complete sign-in.',
        detail: 'The authorization code exchange failed. Please try again.',
        buttons: ['OK'],
      });
      return null;
    }

    const { session_token, user_id } = await exchangeResponse.json();
    log(`Session token received for userId=${user_id}`);

    // Fetch organizations and register device (calls the NestJS API)
    const authData = await fetchOrgsAndRegister(apiUrl, session_token, user_id, deviceInfo);

    if (authData) {
      setAuth(authData);
      log(`Auth complete: ${authData.organizations.length} org(s) registered`);
    }

    return authData;
  } catch (error) {
    log(`Login failed: ${error}`, 'ERROR');
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Sign-In Failed',
      message: 'An unexpected error occurred during sign-in.',
      detail: `${error}`,
      buttons: ['OK'],
    });
    return null;
  } finally {
    if (server) {
      server.close();
      log('Callback server shut down');
    }
  }
}

/**
 * Starts a temporary HTTP server on localhost to receive the auth callback.
 * Returns the port, a promise that resolves with the auth code, and the server instance.
 */
function startCallbackServer(
  expectedState: string,
): Promise<{ port: number; codePromise: Promise<string | null>; serverInstance: Server }> {
  return new Promise((resolveSetup, rejectSetup) => {
    let resolveCode: (code: string | null) => void;
    const codePromise = new Promise<string | null>((resolve) => {
      resolveCode = resolve;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`);

      if (url.pathname !== '/auth-callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // Validate state to prevent CSRF
      if (state !== expectedState) {
        log(`State mismatch: expected=${expectedState}, got=${state}`, 'ERROR');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorPage('Invalid request. Please try signing in again.'));
        resolveCode(null);
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorPage('Missing authorization code. Please try signing in again.'));
        resolveCode(null);
        return;
      }

      // Success - send a nice page to the browser
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(successPage());
      resolveCode(code);
    });

    // Bind to localhost only (127.0.0.1), port 0 for OS-assigned port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        rejectSetup(new Error('Failed to get server address'));
        return;
      }
      log(`Callback server listening on port ${addr.port}`);
      resolveSetup({ port: addr.port, codePromise, serverInstance: server });
    });

    server.on('error', (err) => {
      log(`Callback server error: ${err}`, 'ERROR');
      rejectSetup(err);
    });

    // Timeout: resolve with null if no callback received
    setTimeout(() => {
      resolveCode(null);
    }, LOGIN_TIMEOUT_MS);
  });
}

/**
 * After receiving a session token, fetches the user's orgs and registers the device for all of them.
 */
async function fetchOrgsAndRegister(
  apiUrl: string,
  sessionToken: string,
  userId: string,
  deviceInfo: DeviceInfo,
): Promise<StoredAuth | null> {
  const authHeader = `Bearer ${sessionToken}`;

  // Fetch all organizations the user belongs to
  const orgsResponse = await fetch(`${apiUrl}${API_ROUTES.MY_ORGANIZATIONS}`, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
  });

  if (!orgsResponse.ok) {
    log(`Failed to fetch organizations: ${orgsResponse.status}`, 'ERROR');
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Sign-In Failed',
      message: 'Could not fetch your organizations.',
      detail: `The server returned status ${orgsResponse.status}. Please try signing in again.`,
      buttons: ['OK'],
    });
    return null;
  }

  const orgsData: MyOrganizationsResponse = await orgsResponse.json();

  if (!orgsData.organizations || orgsData.organizations.length === 0) {
    log('User has no organizations', 'WARN');
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'No Organization Found',
      message: "You're not part of any organization.",
      detail:
        'Contact your administrator to be added to an organization, then try signing in again.',
      buttons: ['OK'],
    });
    return null;
  }

  log(
    `Found ${orgsData.organizations.length} org(s): ${orgsData.organizations.map((o) => o.organizationName).join(', ')}`,
  );

  // Register the device for EVERY organization
  const registrations: OrgRegistration[] = [];

  for (const org of orgsData.organizations) {
    log(`Registering device for org: ${org.organizationName} (${org.organizationId})`);

    try {
      const registerResponse = await fetch(`${apiUrl}${API_ROUTES.REGISTER}`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deviceInfo,
          agentVersion: AGENT_VERSION,
          organizationId: org.organizationId,
        }),
      });

      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        log(
          `Failed to register for org ${org.organizationName}: ${registerResponse.status} - ${errorText}`,
          'ERROR',
        );
        continue;
      }

      const registerData: RegisterDeviceResponse = await registerResponse.json();
      log(`Registered for ${org.organizationName}: deviceId=${registerData.deviceId}`);

      registrations.push({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        deviceId: registerData.deviceId,
      });
    } catch (error) {
      log(`Error registering for org ${org.organizationName}: ${error}`, 'ERROR');
    }
  }

  if (registrations.length === 0) {
    log('Failed to register device for any organization', 'ERROR');
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Registration Failed',
      message: 'Failed to register your device.',
      detail: 'Please try again. If the problem persists, contact your administrator.',
      buttons: ['OK'],
    });
    return null;
  }

  return {
    sessionToken,
    cookieName: 'better-auth.session_token',
    userId,
    organizations: registrations,
  };
}

function successPage(): string {
  return `<!DOCTYPE html>
<html>
<head><title>Comp AI</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa;">
  <div style="text-align: center; padding: 2rem;">
    <h2 style="color: #111; margin-bottom: 0.5rem;">Sign-in complete!</h2>
    <p style="color: #666;">You can close this tab and return to the Comp AI agent.</p>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Comp AI</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa;">
  <div style="text-align: center; padding: 2rem;">
    <h2 style="color: #111; margin-bottom: 0.5rem;">Sign-in failed</h2>
    <p style="color: #666;">${message}</p>
  </div>
</body>
</html>`;
}

/**
 * Sign out: clear stored auth data
 */
export async function performLogout(): Promise<void> {
  clearAuth();
}
