import { BrowserWindow, dialog, session } from 'electron';
import { AGENT_VERSION, API_ROUTES } from '../shared/constants';
import type {
  DeviceInfo,
  MyOrganizationsResponse,
  OrgRegistration,
  RegisterDeviceResponse,
  StoredAuth,
} from '../shared/types';
import { log } from './logger';
import { getPortalUrl, setAuth } from './store';

/**
 * Opens a BrowserWindow pointing at the portal login page.
 * After successful authentication:
 *  1. Fetches the user's organizations
 *  2. If no orgs → shows error and signs out
 *  3. Registers the device for ALL organizations
 */
export async function performLogin(deviceInfo: DeviceInfo): Promise<StoredAuth | null> {
  const portalUrl = getPortalUrl();
  const portalOrigin = new URL(portalUrl).origin;

  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 480,
      height: 640,
      title: 'Comp AI - Sign In',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true,
      resizable: true,
    });

    let isResolved = false;

    const finish = (result: StoredAuth | null) => {
      if (isResolved) return;
      isResolved = true;
      resolve(result);
      if (!authWindow.isDestroyed()) {
        authWindow.close();
      }
    };

    // Handle OAuth popups (Google/Microsoft sign-in open new windows)
    authWindow.webContents.setWindowOpenHandler(({ url }) => {
      log(`OAuth popup requested: ${url}`);
      return { action: 'allow' };
    });

    // Navigate to the portal auth page
    log(`Loading auth page: ${portalUrl}/auth`);
    authWindow.loadURL(`${portalUrl}/auth`);

    const handleNavigation = async (url: string, source: string) => {
      if (isResolved) return;

      const parsed = new URL(url);
      log(`${source}: ${parsed.pathname}`);

      // Skip non-portal origins (Google OAuth page, etc.)
      if (parsed.origin !== portalOrigin) return;

      // Skip the auth page and API routes
      if (parsed.pathname.startsWith('/auth')) return;
      if (parsed.pathname.startsWith('/api/')) return;

      // The user has navigated past the auth page — they're logged in.
      // Could be / (org picker), /{orgId} (single org redirect), or /unauthorized
      log(`Post-login page detected: ${parsed.pathname}`);

      // Wait for cookies to settle
      await new Promise((r) => setTimeout(r, 500));

      try {
        const authData = await extractAuthAndRegisterAll(deviceInfo, authWindow);
        if (authData) {
          setAuth(authData);
          log(
            `Auth complete: ${authData.organizations.length} org(s) registered`,
          );
          finish(authData);
        }
        // If null, don't close — might be intermediate navigation
      } catch (error) {
        log(`Auth extraction failed: ${error}`, 'ERROR');
      }
    };

    authWindow.webContents.on('did-navigate', (_event, url) => {
      handleNavigation(url, 'Navigation');
    });

    authWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      handleNavigation(url, 'In-page navigation');
    });

    authWindow.on('closed', () => {
      if (!isResolved) {
        log('Auth window closed by user before login completed');
        isResolved = true;
        resolve(null);
      }
    });
  });
}

/**
 * After login, fetches the user's orgs and registers the device for all of them.
 * Shows an error dialog if the user has no organizations.
 */
async function extractAuthAndRegisterAll(
  deviceInfo: DeviceInfo,
  authWindow: BrowserWindow,
): Promise<StoredAuth | null> {
  const portalUrl = getPortalUrl();

  // 1. Get session cookie
  const cookies = await session.defaultSession.cookies.get({ url: portalUrl });
  const sessionCookie = cookies.find(
    (c) =>
      c.name === 'better-auth.session_token' ||
      c.name === '__Secure-better-auth.session_token',
  );

  if (!sessionCookie) {
    log('No session cookie found after login', 'WARN');
    return null;
  }

  const sessionToken = sessionCookie.value;
  const cookieHeader = `${sessionCookie.name}=${sessionToken}`;

  // 2. Get userId from session
  const sessionResponse = await fetch(`${portalUrl}/api/auth/get-session`, {
    headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
  });

  if (!sessionResponse.ok) {
    log(`Session fetch failed: ${sessionResponse.status}`, 'ERROR');
    return null;
  }

  const sessionData = await sessionResponse.json();
  const userId = sessionData?.user?.id;

  if (!userId) {
    log('No userId in session', 'ERROR');
    return null;
  }

  log(`Authenticated as userId=${userId}`);

  // 3. Fetch all organizations the user belongs to
  const orgsResponse = await fetch(`${portalUrl}${API_ROUTES.MY_ORGANIZATIONS}`, {
    headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
  });

  if (!orgsResponse.ok) {
    log(`Failed to fetch organizations: ${orgsResponse.status}`, 'ERROR');
    return null;
  }

  const orgsData: MyOrganizationsResponse = await orgsResponse.json();

  if (!orgsData.organizations || orgsData.organizations.length === 0) {
    log('User has no organizations', 'WARN');
    dialog.showMessageBoxSync(authWindow, {
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

  // 4. Register the device for EVERY organization
  const registrations: OrgRegistration[] = [];

  for (const org of orgsData.organizations) {
    log(`Registering device for org: ${org.organizationName} (${org.organizationId})`);

    try {
      const registerResponse = await fetch(`${portalUrl}${API_ROUTES.REGISTER}`, {
        method: 'POST',
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
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
        continue; // Skip this org but keep going
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
    dialog.showMessageBoxSync(authWindow, {
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
    userId,
    organizations: registrations,
  };
}

/**
 * Sign out: clear session cookies and stored auth
 */
export async function performLogout(): Promise<void> {
  const portalUrl = getPortalUrl();
  try {
    await session.defaultSession.cookies.remove(portalUrl, 'better-auth.session_token');
    await session.defaultSession.cookies.remove(portalUrl, '__Secure-better-auth.session_token');
  } catch {
    // Ignore cookie removal errors
  }
}
