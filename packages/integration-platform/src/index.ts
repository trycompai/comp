// ============================================================================
// Integration Platform - Main Exports
// ============================================================================

// Types
export type {
  // Auth types
  ApiKeyConfig,
  AuthStrategy,
  AuthStrategyType,
  BasicAuthConfig,
  // Check types
  CheckContext,
  CheckEvidence,
  CheckFindingResult,
  CheckPassingResult,
  CheckVariable,
  CheckVariableType,
  CheckVariableValues,
  // Connection & Run types
  ConnectionStatus,
  // Credential types
  CredentialField,
  CustomAuthConfig,
  // Finding types
  FindingSeverity,
  FindingStatus,
  // Capability types
  IntegrationCapability,
  // Category type
  IntegrationCategory,
  IntegrationCheck,
  // Handler types
  IntegrationCredentials,
  IntegrationFinding,
  IntegrationHandler,
  // Manifest type
  IntegrationManifest,
  // Registry type
  IntegrationRegistry,
  JwtConfig,
  OAuthConfig,
  RunJobType,
  RunStatus,
  VariableFetchContext,
  // Webhook types
  WebhookConfig,
} from './types';

// Zod schemas for validation
export {
  ApiKeyConfigSchema,
  BasicAuthConfigSchema,
  CredentialFieldSchema,
  CustomAuthConfigSchema,
  JwtConfigSchema,
  OAuthConfigSchema,
  WebhookConfigSchema,
} from './types';

// Registry
export {
  getActiveManifests,
  getAllManifests,
  getByCategory,
  getCategoriesWithCounts,
  getHandler,
  getIntegrationIds,
  getManifest,
  getOAuthConfig,
  registry,
  requiresOAuth,
} from './registry';

// Runtime (check execution)
export {
  createCheckContext,
  getAvailableChecks,
  runAllChecks,
  runCheck,
  type CheckContextOptions,
  type CheckResult,
  type CheckRunResult,
  type RunAllChecksResult,
  type RunCheckOptions,
} from './runtime';

// Task mappings (for type-safe task mapping in checks)
export {
  TASK_TEMPLATES,
  TASK_TEMPLATE_IDS,
  TASK_TEMPLATE_INFO,
  type TaskTemplateId,
} from './task-mappings';

// DSL Engine (declarative check definitions)
export {
  interpretDeclarativeCheck,
  evaluateCondition,
  evaluateOperator,
  resolvePath,
  interpolate,
  interpolateTemplate,
  validateIntegrationDefinition,
  CheckDefinitionSchema,
  DynamicIntegrationDefinitionSchema,
  ConditionSchema,
  DSLStepSchema,
} from './dsl';

export type {
  DSLStep,
  CheckDefinition,
  Condition,
  DynamicIntegrationDefinition,
  ValidationResult,
  PaginationConfig,
} from './dsl';

// Individual manifests (for direct import if needed)
export { manifest as githubManifest } from './manifests/github';

// Ramp types (used by sync controller)
export type {
  RampUser,
  RampUserStatus,
  RampUserRole,
  RampKnownRole,
  RampEmployee,
  RampUsersResponse,
  RoleMappingEntry,
} from './manifests/ramp/types';

// API Response types (for frontend and API type sharing)
export type {
  CheckRunFindingResponse,
  CheckRunHistoryItemResponse,
  CheckRunPassingResponse,
  ConnectionListItemResponse,
  ConnectionStatusValue,
  CreateConnectionResponse,
  IntegrationConnectionResponse,
  IntegrationProviderResponse,
  OAuthAvailabilityResponse,
  OAuthStartResponse,
  TaskIntegrationCheckResponse,
  TestConnectionResponse,
  VariableOptionResponse,
} from './api-types';
