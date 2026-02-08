import { contextBridge, ipcRenderer } from 'electron';
import type { DeviceCheckType } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

/**
 * Preload script exposes a safe API to the renderer via contextBridge.
 */
contextBridge.exposeInMainWorld('compAgent', {
  getAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_STATUS),
  login: () => ipcRenderer.invoke(IPC_CHANNELS.LOGIN),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.LOGOUT),
  getCheckResults: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CHECK_RESULTS),
  runChecksNow: () => ipcRenderer.invoke(IPC_CHANNELS.RUN_CHECKS_NOW),
  getDeviceInfo: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICE_INFO),

  // Remediation APIs
  getRemediationInfo: () => ipcRenderer.invoke(IPC_CHANNELS.GET_REMEDIATION_INFO),
  remediateCheck: (checkType: DeviceCheckType) =>
    ipcRenderer.invoke(IPC_CHANNELS.REMEDIATE_CHECK, checkType),

  // Event listeners
  onAuthStateChanged: (callback: (isAuthenticated: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isAuthenticated: boolean) => {
      callback(isAuthenticated);
    };
    ipcRenderer.on(IPC_CHANNELS.AUTH_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AUTH_STATE_CHANGED, handler);
  },

  onCheckResultsUpdated: (
    callback: (data: { results: unknown[]; isCompliant: boolean }) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { results: unknown[]; isCompliant: boolean },
    ) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.CHECK_RESULTS_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHECK_RESULTS_UPDATED, handler);
  },
});
