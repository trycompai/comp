import { app, BrowserWindow, Menu, nativeImage, shell, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import type { CheckResult } from '../shared/types';
import { isAutoLaunchEnabled, setAutoLaunch } from './auto-launch';
import { log } from './logger';
import { getPortalUrl } from './store';

export type AutoUpdateStatus = 'downloading' | 'ready' | 'update-available' | null;

let tray: Tray | null = null;
let statusWindow: BrowserWindow | null = null;
let currentAutoUpdateStatus: AutoUpdateStatus = null;

export type TrayStatus = 'compliant' | 'non-compliant' | 'checking' | 'unauthenticated';

/**
 * Returns the path to the assets directory, handling both dev and packaged modes.
 */
function getAssetsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets');
  }
  return path.join(__dirname, '../../assets');
}

/**
 * Loads a tray icon PNG from the assets directory and adds transparent padding
 * so the icon has breathing room in the system tray.
 *
 * Resizes the icon to `innerSize` and centers it on a `canvasSize` transparent canvas.
 * Falls back to an empty image if the file is missing.
 */
function loadTrayIcon(filename: string): Electron.NativeImage {
  const canvasSize = 20;
  const innerSize = 16;
  const padding = Math.floor((canvasSize - innerSize) / 2);

  try {
    const iconPath = path.join(getAssetsPath(), filename);
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      log(`Tray icon not found or empty: ${iconPath}`);
      return nativeImage.createEmpty();
    }

    // Resize icon content to innerSize
    const resized = icon.resize({ width: innerSize, height: innerSize, quality: 'best' });
    const resizedBitmap = resized.toBitmap();

    // Create a transparent canvas and center the resized icon
    const bytesPerPixel = 4;
    const canvas = Buffer.alloc(canvasSize * canvasSize * bytesPerPixel, 0);

    for (let y = 0; y < innerSize; y++) {
      const srcOffset = y * innerSize * bytesPerPixel;
      const destOffset = ((y + padding) * canvasSize + padding) * bytesPerPixel;
      resizedBitmap.copy(canvas, destOffset, srcOffset, srcOffset + innerSize * bytesPerPixel);
    }

    return nativeImage.createFromBuffer(canvas, {
      width: canvasSize,
      height: canvasSize,
      scaleFactor: 1.0,
    });
  } catch (error) {
    log(`Failed to load tray icon ${filename}: ${error}`);
    return nativeImage.createEmpty();
  }
}

function getIconForStatus(status: TrayStatus): Electron.NativeImage {
  switch (status) {
    case 'compliant':
      return loadTrayIcon('16x16-pass.png');
    case 'non-compliant':
      return loadTrayIcon('16x16-fail.png');
    case 'checking':
    case 'unauthenticated':
      return loadTrayIcon('16x16-default.png');
  }
}

/**
 * Creates and manages the system tray icon and menu.
 */
export function createTray(callbacks: {
  onSignIn: () => void;
  onRunChecks: () => void;
  onViewDetails: () => void;
  onSignOut: () => void;
  onQuit: () => void;
}): Tray {
  log('Creating system tray...');

  try {
    const icon = getIconForStatus('unauthenticated');
    tray = new Tray(icon);
    tray.setToolTip('Comp AI Device Agent');
    updateTrayMenu('unauthenticated', [], callbacks);
    log('System tray created successfully');
  } catch (error) {
    log(`Failed to create tray: ${error}`);
    throw error;
  }

  return tray;
}

/**
 * Updates the auto-update status and refreshes the tray menu.
 */
export function setAutoUpdateStatus(status: AutoUpdateStatus): void {
  currentAutoUpdateStatus = status;
}

/**
 * Updates the tray icon and menu based on the current status.
 */
export function updateTrayMenu(
  status: TrayStatus,
  checkResults: CheckResult[],
  callbacks: {
    onSignIn: () => void;
    onRunChecks: () => void;
    onViewDetails: () => void;
    onSignOut: () => void;
    onQuit: () => void;
  },
): void {
  if (!tray) return;

  const isAuthenticated = status !== 'unauthenticated';
  const statusLabel = getStatusLabel(status);

  try {
    const icon = getIconForStatus(status);
    tray.setImage(icon);
  } catch (error) {
    log(`Failed to update tray icon: ${error}`);
  }

  tray.setToolTip(`Comp AI Device Agent - ${statusLabel}`);

  const checkMenuItems =
    checkResults.length > 0
      ? [
          { type: 'separator' as const },
          ...checkResults.map((check) => ({
            label: `${check.passed ? '\u2705' : '\u274C'} ${formatCheckName(check.checkType)}`,
            enabled: false,
          })),
        ]
      : [];

  // Build menu based on auth state
  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: statusLabel,
      enabled: false,
    },
  ];

  if (!isAuthenticated) {
    // Not signed in: show Sign In prominently
    menuItems.push(
      { type: 'separator' },
      {
        label: 'Sign In...',
        click: callbacks.onSignIn,
      },
    );
  } else {
    // Signed in: show checks and actions
    menuItems.push(...checkMenuItems);
    menuItems.push(
      { type: 'separator' },
      {
        label: 'Run Checks Now',
        click: callbacks.onRunChecks,
        enabled: status !== 'checking',
      },
      {
        label: 'View Details',
        click: callbacks.onViewDetails,
      },
      { type: 'separator' },
      {
        label: 'Sign Out',
        click: callbacks.onSignOut,
      },
    );
  }

  // Show auto-update status
  if (currentAutoUpdateStatus === 'downloading') {
    menuItems.push(
      { type: 'separator' },
      {
        label: 'Downloading update...',
        enabled: false,
      },
    );
  } else if (currentAutoUpdateStatus === 'ready') {
    menuItems.push(
      { type: 'separator' },
      {
        label: 'Update ready — restart to install',
        click: () => {
          autoUpdater.quitAndInstall();
        },
      },
    );
  } else if (currentAutoUpdateStatus === 'update-available') {
    menuItems.push(
      { type: 'separator' },
      {
        label: 'New version available — download from portal',
        click: () => {
          const portalUrl = getPortalUrl();
          shell.openExternal(portalUrl);
        },
      },
    );
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: isAutoLaunchEnabled(),
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked);
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: callbacks.onQuit },
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
}

/**
 * Opens the status details window showing check results.
 */
export function openStatusWindow(): void {
  if (statusWindow && !statusWindow.isDestroyed()) {
    statusWindow.focus();
    return;
  }

  statusWindow = new BrowserWindow({
    width: 480,
    height: 720,
    title: 'Comp AI - Device Status',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    resizable: false,
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    statusWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    statusWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  statusWindow.on('closed', () => {
    statusWindow = null;
  });
}

export function getStatusWindow(): BrowserWindow | null {
  return statusWindow && !statusWindow.isDestroyed() ? statusWindow : null;
}

function getStatusLabel(status: TrayStatus): string {
  switch (status) {
    case 'compliant':
      return 'Status: Compliant';
    case 'non-compliant':
      return 'Status: Non-Compliant';
    case 'checking':
      return 'Status: Checking...';
    case 'unauthenticated':
      return 'Status: Not Signed In';
  }
}

function formatCheckName(checkType: string): string {
  const names: Record<string, string> = {
    disk_encryption: 'Disk Encryption',
    antivirus: 'Antivirus',
    password_policy: 'Password Policy',
    screen_lock: 'Screen Lock',
  };
  return names[checkType] ?? checkType;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
