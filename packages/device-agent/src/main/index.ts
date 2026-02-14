import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { getAllRemediationInfo, runRemediation } from '../remediations';
import type { CheckResult, DeviceCheckType } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';
import { performLogin, performLogout } from './auth';
import { initAutoLaunch } from './auto-launch';
import { getDeviceInfo } from './device-info';
import { log } from './logger';
import { runChecksNow, setSessionExpiredHandler, startScheduler, stopScheduler } from './scheduler';
import { clearAuth, getAuth, getLastCheckResults } from './store';
import {
  createTray,
  destroyTray,
  getStatusWindow,
  openStatusWindow,
  setAutoUpdateStatus,
  type TrayStatus,
  updateTrayMenu,
} from './tray';

// --- Linux Wayland/Ozone support ---
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-auto');
}

// --- Top-level crash logging ---
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack ?? error.message}`, 'ERROR');
});
process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, 'ERROR');
});

log('Comp AI Device Agent starting...');
log(`Platform: ${process.platform}, Arch: ${process.arch}, Electron: ${process.versions.electron}`);

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log('Another instance is already running, quitting.');
  app.quit();
}

// Don't show the app in the dock on macOS (tray-only app)
if (process.platform === 'darwin') {
  app.dock?.hide();
}

let currentStatus: TrayStatus = 'unauthenticated';
let currentResults: CheckResult[] = [];

// Handle session expiry: clear auth, update UI, and re-prompt login
setSessionExpiredHandler(async () => {
  log('Session expired — clearing auth and prompting re-login');
  stopScheduler();
  await performLogout();
  clearAuth();
  currentResults = [];
  setStatus('unauthenticated');
  notifyRenderer(IPC_CHANNELS.AUTH_STATE_CHANGED, false);
  // Auto-open sign-in so the user can re-authenticate immediately
  triggerSignIn();
});

async function triggerSignIn(): Promise<void> {
  log('Sign-in flow triggered');
  const deviceInfo = getDeviceInfo();
  const auth = await performLogin(deviceInfo);

  if (auth) {
    const orgNames = auth.organizations.map((o) => o.organizationName).join(', ');
    log(`Login successful: ${auth.organizations.length} org(s) — ${orgNames}`);
    notifyRenderer(IPC_CHANNELS.AUTH_STATE_CHANGED, true);
    setStatus('checking');
    startScheduler(handleCheckComplete);
  } else {
    log('Login cancelled or failed');
  }
}

const trayCallbacks = {
  onSignIn: () => {
    triggerSignIn();
  },
  onRunChecks: () => {
    log('User triggered manual check run');
    setStatus('checking');
    runChecksNow(handleCheckComplete);
  },
  onViewDetails: () => {
    log('Opening status window');
    openStatusWindow();
  },
  onSignOut: async () => {
    log('User signing out');
    stopScheduler();
    await performLogout();
    clearAuth();
    currentResults = [];
    setStatus('unauthenticated');
    notifyRenderer(IPC_CHANNELS.AUTH_STATE_CHANGED, false);
  },
  onQuit: () => {
    log('User quitting app');
    stopScheduler();
    destroyTray();
    app.quit();
  },
};

function setStatus(status: TrayStatus) {
  currentStatus = status;
  updateTrayMenu(status, currentResults, trayCallbacks);
}

function handleCheckComplete(results: CheckResult[], isCompliant: boolean) {
  currentResults = results;
  log(`Check complete: ${isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'} (${results.length} checks)`);
  setStatus(isCompliant ? 'compliant' : 'non-compliant');
  notifyRenderer(IPC_CHANNELS.CHECK_RESULTS_UPDATED, { results, isCompliant });
}

function notifyRenderer(channel: string, data: unknown) {
  const statusWindow = getStatusWindow();
  if (statusWindow && !statusWindow.isDestroyed()) {
    statusWindow.webContents.send(channel, data);
  }
}

// --- IPC Handlers ---

ipcMain.handle(IPC_CHANNELS.GET_AUTH_STATUS, () => {
  const auth = getAuth();
  return {
    isAuthenticated: auth !== null,
    organizations: auth?.organizations ?? [],
  };
});

ipcMain.handle(IPC_CHANNELS.LOGIN, async () => {
  await triggerSignIn();
  return getAuth() !== null;
});

ipcMain.handle(IPC_CHANNELS.LOGOUT, async () => {
  log('Logout via IPC');
  stopScheduler();
  await performLogout();
  clearAuth();
  currentResults = [];
  setStatus('unauthenticated');
  notifyRenderer(IPC_CHANNELS.AUTH_STATE_CHANGED, false);
});

ipcMain.handle(IPC_CHANNELS.GET_CHECK_RESULTS, () => {
  return getLastCheckResults();
});

ipcMain.handle(IPC_CHANNELS.RUN_CHECKS_NOW, async () => {
  log('Run checks now via IPC');
  setStatus('checking');
  await runChecksNow(handleCheckComplete);
});

ipcMain.handle(IPC_CHANNELS.GET_DEVICE_INFO, () => {
  return getDeviceInfo();
});

ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
  return app.getVersion();
});

ipcMain.handle(IPC_CHANNELS.GET_REMEDIATION_INFO, () => {
  return getAllRemediationInfo();
});

ipcMain.handle(IPC_CHANNELS.REMEDIATE_CHECK, async (_event, checkType: DeviceCheckType) => {
  log(`Remediation requested for: ${checkType}`);
  const result = await runRemediation(checkType);
  log(`Remediation result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);

  // Re-run checks after remediation to verify the fix and update status
  if (result.success && !result.openedSettings) {
    log('Re-running checks after successful remediation...');
    // Small delay to let system changes propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await runChecksNow(handleCheckComplete);
  }

  return result;
});

// --- Auto-Updater ---

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * On Linux, electron-updater can only auto-update AppImage builds.
 * For .deb installs (process.env.APPIMAGE is not set), we manually
 * fetch the latest-linux.yml manifest, compare versions, and show
 * a tray notification directing the user to re-download from the portal.
 */
function isLinuxNonAppImage(): boolean {
  return process.platform === 'linux' && !process.env.APPIMAGE;
}

/**
 * Simple semver comparison: returns true if remote > local.
 * Handles versions like "1.2.3" — ignores pre-release tags.
 */
function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

/**
 * Manual update checker for Linux .deb installs.
 * Fetches latest-linux.yml from the update server, parses the version,
 * and sets a tray notification if a newer version is available.
 */
async function checkForManualUpdate(): Promise<void> {
  try {
    const updateUrl =
      process.env.AUTO_UPDATE_URL || 'https://portal.trycomp.ai/api/device-agent/updates';
    const ymlUrl = `${updateUrl}/latest-linux.yml`;

    log(`Manual update check: fetching ${ymlUrl}`);
    const response = await fetch(ymlUrl);

    if (!response.ok) {
      log(`Manual update check: server returned ${response.status}`, 'WARN');
      return;
    }

    const yml = await response.text();
    // Parse version from YAML (format: "version: 1.2.3")
    const versionMatch = yml.match(/^version:\s*(.+)$/m);
    if (!versionMatch) {
      log('Manual update check: could not parse version from manifest', 'WARN');
      return;
    }

    const remoteVersion = versionMatch[1].trim();
    const localVersion = app.getVersion();

    if (isNewerVersion(remoteVersion, localVersion)) {
      log(`Manual update: v${remoteVersion} available (current: v${localVersion})`);
      setAutoUpdateStatus('update-available');
      updateTrayMenu(currentStatus, currentResults, trayCallbacks);
    } else {
      log(`Manual update check: up to date (v${localVersion})`);
    }
  } catch (err) {
    log(`Manual update check failed: ${err}`, 'WARN');
  }
}

function initAutoUpdater(): void {
  if (!app.isPackaged) {
    log('Skipping auto-updater in dev mode');
    return;
  }

  // Linux .deb installs can't use electron-updater — use manual check instead
  if (isLinuxNonAppImage()) {
    log('Linux non-AppImage detected — using manual update checker');
    checkForManualUpdate();
    setInterval(checkForManualUpdate, UPDATE_CHECK_INTERVAL_MS);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on('checking-for-update', () => {
    log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log(`Update available: v${info.version}`);
    setAutoUpdateStatus('downloading');
    updateTrayMenu(currentStatus, currentResults, trayCallbacks);
  });

  autoUpdater.on('update-not-available', () => {
    log('No update available');
  });

  autoUpdater.on('download-progress', (progress) => {
    log(`Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`Update downloaded: v${info.version} — will install on next restart`);
    setAutoUpdateStatus('ready');
    updateTrayMenu(currentStatus, currentResults, trayCallbacks);
  });

  autoUpdater.on('error', (err) => {
    log(`Auto-update error: ${err.message}`, 'WARN');
    setAutoUpdateStatus(null);
  });

  // Check on launch
  autoUpdater.checkForUpdates().catch((err) => {
    log(`Auto-update check failed: ${err}`, 'WARN');
  });

  // Check periodically
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log(`Auto-update check failed: ${err}`, 'WARN');
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  log('App ready, creating tray...');

  try {
    createTray(trayCallbacks);
    log('Tray created successfully');
  } catch (error) {
    log(`Fatal: Failed to create tray: ${error}`, 'ERROR');
    app.quit();
    return;
  }

  // Sync OS login-item setting with stored preference (handles path changes after updates)
  initAutoLaunch();

  // If already authenticated, start the scheduler
  const auth = getAuth();
  if (auth) {
    log(`Already authenticated (${auth.organizations.length} org(s)), starting scheduler`);
    setStatus('checking');
    startScheduler(handleCheckComplete);
  } else {
    // Not authenticated: auto-open the sign-in window so the user knows what to do
    log('Not authenticated, opening sign-in window automatically');
    triggerSignIn();
  }

  // Silent auto-updates via electron-updater
  initAutoUpdater();
});

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed - keep running in tray
});

app.on('before-quit', () => {
  log('App quitting...');
  stopScheduler();
  destroyTray();
});

// Handle second instance attempts
app.on('second-instance', () => {
  log('Second instance detected, opening status window');
  openStatusWindow();
});
