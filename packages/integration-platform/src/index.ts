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
  // Service types
  IntegrationService,
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
  isCodeManifest,
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

// DSL Engine (declarative check and sync definitions)
export {
  CheckDefinitionSchema,
  CodeStepSchema,
  ConditionSchema,
  DSLStepSchema,
  DynamicIntegrationDefinitionSchema,
  SyncDefinitionSchema,
  SyncDeviceSchema,
  SyncEmployeeSchema,
  evaluateCondition,
  evaluateOperator,
  interpolate,
  interpolateTemplate,
  interpretDeclarativeCheck,
  interpretDeclarativeDeviceSync,
  interpretDeclarativeSync,
  resolvePath,
  validateIntegrationDefinition,
} from './dsl';

export type {
  CheckDefinition,
  CodeStep,
  Condition,
  DSLStep,
  DynamicIntegrationDefinition,
  PaginationConfig,
  SyncDefinition,
  SyncDevice,
  SyncEmployee,
  ValidationResult,
} from './dsl';

// Individual manifests (for direct import if needed)
export { manifest as githubManifest } from './manifests/github';

export { getNativeSourceIdentity } from './runtime/native-source-identity';

// Directory sync email include/exclude terms (Google Workspace, JumpCloud, checks)
export { matchesSyncFilterTerms, parseSyncFilterTerms } from './sync-filter/email-exclusion-terms';

// AWS credential helpers (used by frontend setup dialogs)
export {
  awsRemediationScript,
  getAwsCloudShellScript,
  getAwsCloudShellUrl,
  getAwsRemediationScript,
  normalizeAwsEnvironment,
} from './manifests/aws/credentials';
export type { AwsEnvironment } from './manifests/aws/credentials';

// Shared AWS STS AssumeRole retry (transient / IAM-eventual-consistency safe),
// reused by the Cloud Tests scanner in apps/api.
export { isRetryableAssumeError, retryAssume } from './manifests/aws/checks/assume-retry';

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

export {
  createNativeCompletionBinding,
  createNativeScanCompletionBinding,
  declarativeDefinitionIdentity,
  dynamicManifestIdentity,
  type NativeCompletionContext,
} from './runtime/completion-binding';
