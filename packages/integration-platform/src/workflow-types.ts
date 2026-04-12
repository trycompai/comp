/**
 * Workflow definition types for the visual workflow builder.
 * Used by both the API (execution engine) and the React Flow canvas.
 */

// --- Graph structure ---

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeConfig;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// --- Node types ---

export type WorkflowNodeType =
  // Triggers
  | 'trigger_schedule'
  | 'trigger_webhook'
  | 'trigger_manual'
  | 'trigger_event'
  // Actions
  | 'action_integration_api'
  | 'action_run_check'
  | 'action_send_notification'
  | 'action_create_finding'
  | 'action_create_task'
  | 'action_update_vendor'
  // Logic
  | 'logic_condition'
  | 'logic_loop'
  | 'logic_delay'
  // Data
  | 'data_transform'
  | 'data_filter';

// --- Node configs (discriminated union) ---

export type WorkflowNodeConfig =
  | ScheduleTriggerConfig
  | WebhookTriggerConfig
  | ManualTriggerConfig
  | EventTriggerConfig
  | IntegrationApiActionConfig
  | RunCheckActionConfig
  | SendNotificationConfig
  | CreateFindingConfig
  | CreateTaskConfig
  | UpdateVendorConfig
  | ConditionConfig
  | LoopConfig
  | DelayConfig
  | TransformConfig
  | FilterConfig;

export interface ScheduleTriggerConfig {
  nodeType: 'trigger_schedule';
  label: string;
  cron: string;
  timezone?: string;
}

export interface WebhookTriggerConfig {
  nodeType: 'trigger_webhook';
  label: string;
  secret?: string;
}

export interface ManualTriggerConfig {
  nodeType: 'trigger_manual';
  label: string;
}

export interface EventTriggerConfig {
  nodeType: 'trigger_event';
  label: string;
  eventName: string;
}

export interface IntegrationApiActionConfig {
  nodeType: 'action_integration_api';
  label: string;
  connectionId: string;
  providerSlug: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  outputKey: string;
  dataPath?: string;
}

export interface RunCheckActionConfig {
  nodeType: 'action_run_check';
  label: string;
  connectionId: string;
  providerSlug: string;
  checkIds: string[];
}

export interface SendNotificationConfig {
  nodeType: 'action_send_notification';
  label: string;
  channel: 'email' | 'in_app';
  recipientType: 'role' | 'user' | 'assignee';
  recipientValue: string;
  subject: string;
  body: string;
}

export interface CreateFindingConfig {
  nodeType: 'action_create_finding';
  label: string;
  title: string;
  content: string;
  type: 'soc2' | 'iso27001';
  taskId?: string;
}

export interface CreateTaskConfig {
  nodeType: 'action_create_task';
  label: string;
  title: string;
  description: string;
  assigneeId?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

export interface UpdateVendorConfig {
  nodeType: 'action_update_vendor';
  label: string;
  vendorId: string;
  updates: Record<string, unknown>;
}

export interface ConditionConfig {
  nodeType: 'logic_condition';
  label: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: unknown;
}

export interface LoopConfig {
  nodeType: 'logic_loop';
  label: string;
  collection: string;
  itemAs: string;
  maxIterations?: number;
}

export interface DelayConfig {
  nodeType: 'logic_delay';
  label: string;
  durationMs: number;
}

export interface TransformConfig {
  nodeType: 'data_transform';
  label: string;
  expression: string;
  outputKey: string;
}

export interface FilterConfig {
  nodeType: 'data_filter';
  label: string;
  collection: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: unknown;
  outputKey: string;
}

// --- Execution context ---

export interface WorkflowExecutionContext {
  organizationId: string;
  workflowId: string;
  executionId: string;
  trigger: {
    type: string;
    output: unknown;
  };
  steps: Record<
    string,
    {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      output: unknown;
      startedAt: string;
      completedAt?: string;
    }
  >;
  loop?: {
    item: unknown;
    index: number;
    total: number;
  };
}
