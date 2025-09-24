/**
 * Task Automation Types
 * Centralized type definitions for the task automation system
 */

// ============================================================================
// Script Types
// ============================================================================

export interface TaskAutomationScript {
  content: string;
  key: string;
}

export interface TaskAutomationScriptItem {
  key: string;
  lastModified: string;
  size: number;
}

export interface TaskAutomationScriptsListResponse {
  success: boolean;
  items: TaskAutomationScriptItem[];
  count: number;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface TaskAutomationExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  logs?: string[];
  taskId?: string;
  modelName?: string;
}

export interface TaskAutomationTestResult {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: string;
  logs?: string[];
}

// ============================================================================
// Workflow Types
// ============================================================================

export type WorkflowStepType = 'trigger' | 'action' | 'condition' | 'output';

export type WorkflowIconType =
  | 'start'
  | 'fetch'
  | 'login'
  | 'check'
  | 'process'
  | 'filter'
  | 'notify'
  | 'complete'
  | 'error';

export interface TaskAutomationWorkflowStep {
  id: string;
  title: string;
  description: string;
  type: WorkflowStepType;
  iconType: WorkflowIconType;
}

export interface TaskAutomationWorkflow {
  steps: TaskAutomationWorkflowStep[];
  description: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface TaskAutomationUploadRequest {
  orgId: string;
  taskId: string;
  content: string;
  type: string;
}

export interface TaskAutomationUploadResponse {
  success: boolean;
  bucket: string;
  key: string;
  message: string;
}

export interface TaskAutomationExecuteRequest {
  orgId: string;
  taskId: string;
}

// ============================================================================
// Store Types
// ============================================================================

import type { ChatStatus } from 'ai';

export type ViewMode = 'visual' | 'code';

export interface TaskAutomationStoreState {
  chatStatus: ChatStatus;
  scriptGenerated: boolean;
  scriptPath?: string;
  viewMode: ViewMode;
}

// ============================================================================
// Hook Options Types
// ============================================================================

export interface UseTaskAutomationScriptOptions {
  orgId: string;
  taskId: string;
  enabled?: boolean;
}

export interface UseTaskAutomationScriptsListOptions {
  orgId: string;
  refreshInterval?: number;
}

export interface UseTaskAutomationExecutionOptions {
  orgId: string;
  taskId: string;
  onSuccess?: (result: TaskAutomationExecutionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseTaskAutomationWorkflowOptions {
  scriptContent?: string;
  enabled?: boolean;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface TaskAutomationTesterProps {
  className?: string;
  orgId: string;
}

export interface TaskAutomationWorkflowVisualizerProps {
  className?: string;
}

export interface TaskAutomationScriptInitializerProps {
  orgId: string;
  taskId: string;
}
