/**
 * Task Automation Store
 *
 * Global state management for task automation using Zustand.
 * Manages chat status, script generation state, and data mapping.
 */

import type { ChatStatus, DataUIPart } from 'ai';
import { create } from 'zustand';
import type { TaskAutomationStoreState, ViewMode } from './types';
import type { DataPart } from './types/data-parts';

interface TaskAutomationStore extends TaskAutomationStoreState {
  setChatStatus: (status: ChatStatus) => void;
  setScriptGenerated: (generated: boolean, path?: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setScriptUrl: (url?: string) => void;
}

/**
 * Task Automation Store
 *
 * Manages the global state for task automation features
 */
export const useTaskAutomationStore = create<TaskAutomationStore>()((set) => ({
  // Initial state
  chatStatus: 'ready',
  scriptGenerated: false,
  scriptPath: undefined,
  viewMode: 'visual',
  scriptUrl: undefined,

  // Actions
  setChatStatus: (status) => set({ chatStatus: status }),

  setScriptGenerated: (generated, path) =>
    set({
      scriptGenerated: generated,
      scriptPath: path,
    }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setScriptUrl: (url) => set({ scriptUrl: url }),
}));

/**
 * Data State Mapper Hook
 *
 * Maps AI data events to store state updates.
 * Listens for S3 upload events and updates the UI accordingly.
 */
export function useTaskAutomationDataMapper() {
  const { setScriptGenerated } = useTaskAutomationStore();

  return (data: DataUIPart<DataPart>) => {
    switch (data.type) {
      case 'data-store-to-s3':
        if (data.data.status === 'done' && data.data.key) {
          // Script has been successfully stored to S3
          setScriptGenerated(true, data.data.key);

          // Emit event for workflow visualizer
          window.dispatchEvent(new CustomEvent('task-automation:script-saved'));
        } else if (data.data.status === 'uploading') {
          // Script upload started
          window.dispatchEvent(new CustomEvent('task-automation:script-uploading'));
        }
        break;
      default:
        break;
    }
  };
}
