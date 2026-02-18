import { app } from 'electron';
import { log } from './logger';
import { getOpenAtLogin, setOpenAtLogin } from './store';

/**
 * Syncs the OS login-item setting with the stored preference.
 * Should be called once during app.whenReady() on every launch so the
 * registration stays correct even if the app path changes after an update.
 */
export function initAutoLaunch(): void {
  const enabled = getOpenAtLogin();
  log(`Initializing auto-launch: ${enabled ? 'enabled' : 'disabled'}`);
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
  });
}

/**
 * Toggles start-at-login and persists the preference.
 */
export function setAutoLaunch(enabled: boolean): void {
  log(`Setting auto-launch to: ${enabled ? 'enabled' : 'disabled'}`);
  setOpenAtLogin(enabled);
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
  });
}

/**
 * Reads the current auto-launch state from the OS.
 */
export function isAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
