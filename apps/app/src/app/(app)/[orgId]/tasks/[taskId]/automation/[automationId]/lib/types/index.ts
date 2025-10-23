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
  summary?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
}

export interface TaskAutomationTestResult {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: string;
  logs?: string[];
}

// ============================================================================
// Analyze Types
// ============================================================================

export type AnalyzeStepType = 'trigger' | 'action' | 'condition' | 'output';

export type AnalyzeIconType =
  | 'start'
  | 'fetch'
  | 'login'
  | 'check'
  | 'process'
  | 'filter'
  | 'notify'
  | 'complete'
  | 'error';

export interface TaskAutomationAnalyzeStep {
  id: string;
  title: string;
  description: string;
  type: AnalyzeStepType;
  iconType: AnalyzeIconType;
}

type IntegrationsUsed = Array<{
  name: string;
  link: string;
}>;

export interface TaskAutomationAnalyze {
  steps: TaskAutomationAnalyzeStep[];
  title: string;
  description: string;
  integrationsUsed: IntegrationsUsed;
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
  automationId: string;
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
  scriptUrl?: string;
}

// ============================================================================
// Hook Options Types
// ============================================================================

export interface UseTaskAutomationScriptOptions {
  orgId: string;
  taskId: string;
  automationId: string;
  enabled?: boolean;
}

export interface UseTaskAutomationScriptsListOptions {
  orgId: string;
  refreshInterval?: number;
}

export interface UseTaskAutomationExecutionOptions {
  onSuccess?: (result: TaskAutomationExecutionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseTaskAutomationAnalyzeOptions {
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

export interface TaskAutomationAnalyzeVisualizerProps {
  className?: string;
}

export interface TaskAutomationScriptInitializerProps {
  orgId: string;
  taskId: string;
}
