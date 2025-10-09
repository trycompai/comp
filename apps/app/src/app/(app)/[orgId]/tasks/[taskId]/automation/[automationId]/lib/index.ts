/**
 * Task Automation Library
 * 
 * Main export file for all task automation utilities, types, and API clients.
 */

// Export all types
export * from './types';

// Export API client
export { taskAutomationApi } from './task-automation-api';

// Export store
export { 
  useTaskAutomationStore, 
  useTaskAutomationDataMapper,
} from './task-automation-store';

// Export chat context
export { ChatProvider, useSharedChatContext } from './chat-context';
