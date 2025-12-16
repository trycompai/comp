import { z } from 'zod';
import type { TaskTemplateId } from './task-mappings';

// ============================================================================
// Auth Strategy Types
// ============================================================================

export type AuthStrategyType = 'oauth2' | 'api_key' | 'basic' | 'jwt' | 'custom';

export const OAuthConfigSchema = z.object({
  authorizeUrl: z.string(),
  tokenUrl: z.string().url(),
  scopes: z.array(z.string()),
  pkce: z.boolean().default(false),
  /** Additional parameters to send during authorization */
  authorizationParams: z.record(z.string(), z.string()).optional(),
  /** Additional parameters to send during token exchange */
  tokenParams: z.record(z.string(), z.string()).optional(),
  /** How to send client credentials: 'body' or 'header' (Basic auth) */
  clientAuthMethod: z.enum(['body', 'header']).default('body'),
  /**
   * Instructions for users/admins to create their own OAuth app
   * Displayed in admin UI when configuring credentials
   */
  setupInstructions: z.string().optional(),
  /** URL to the provider's OAuth app creation page */
  createAppUrl: z.string().url().optional(),
  /**
   * Whether this provider supports refresh tokens.
   * If false, tokens are assumed to be long-lived (like GitHub).
   * Default: true
   */
  supportsRefreshToken: z.boolean().default(true),
  /**
   * Separate URL for token refresh (if different from tokenUrl).
   * Most providers use the same tokenUrl for both.
   */
  refreshUrl: z.string().url().optional(),
  /**
   * Additional OAuth settings that admins configure alongside client ID/secret.
   * These are provider-specific settings like Vercel's integration slug or Rippling's app name.
   * The `token` field allows replacing placeholders in authorizeUrl with these values.
   * Example: Vercel uses {APP_SLUG} in the authorize URL which gets replaced with the configured slug.
   */
  additionalOAuthSettings: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['text', 'password', 'textarea', 'select', 'combobox']),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        required: z.boolean().default(false),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
        /** Token to replace in authorizeUrl (e.g., '{APP_SLUG}') */
        token: z.string().optional(),
      }),
    )
    .optional(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

export const ApiKeyConfigSchema = z.object({
  /** Where to send the API key */
  in: z.enum(['header', 'query']),
  /** Header name or query param name */
  name: z.string(),
  /** Optional prefix (e.g., "Bearer ", "Token ") */
  prefix: z.string().optional(),
});

export type ApiKeyConfig = z.infer<typeof ApiKeyConfigSchema>;

export const BasicAuthConfigSchema = z.object({
  /** Field name for username in credential form */
  usernameField: z.string().default('username'),
  /** Field name for password in credential form */
  passwordField: z.string().default('password'),
});

export type BasicAuthConfig = z.infer<typeof BasicAuthConfigSchema>;

export const JwtConfigSchema = z.object({
  /** JWT issuer claim */
  issuer: z.string(),
  /** JWT audience claim */
  audience: z.string(),
  /** Algorithm to use */
  algorithm: z.enum(['RS256', 'HS256', 'ES256']),
  /** Token expiration in seconds */
  expiresIn: z.number().default(3600),
});

export type JwtConfig = z.infer<typeof JwtConfigSchema>;

export const CustomAuthConfigSchema = z.object({
  /** Description of what the custom auth requires */
  description: z.string().optional(),
  /** Credential fields for the custom auth form */
  credentialFields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['text', 'password', 'textarea', 'select', 'combobox', 'number', 'url']),
        required: z.boolean().default(true),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      }),
    )
    .optional(),
  /** Validation schema for credentials (optional, for runtime validation) */
  validationSchema: z.any().optional(),
  /** Setup instructions (markdown) */
  setupInstructions: z.string().optional(),
});

export type CustomAuthConfig = z.infer<typeof CustomAuthConfigSchema>;

export type AuthStrategy =
  | { type: 'oauth2'; config: OAuthConfig }
  | { type: 'api_key'; config: ApiKeyConfig }
  | { type: 'basic'; config: BasicAuthConfig }
  | { type: 'jwt'; config: JwtConfig }
  | { type: 'custom'; config: CustomAuthConfig };

// ============================================================================
// Credential Field Types (for UI form generation)
// ============================================================================

export const CredentialFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'password', 'textarea', 'select', 'combobox', 'number', 'url']),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  /** For select type */
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  /** Validation pattern (regex string) */
  pattern: z.string().optional(),
  /** Default value */
  defaultValue: z.string().optional(),
});

export type CredentialField = z.infer<typeof CredentialFieldSchema>;

// ============================================================================
// Integration Capabilities
// ============================================================================

export type IntegrationCapability = 'checks' | 'webhook' | 'sync';

export const WebhookConfigSchema = z.object({
  /** Webhook endpoint path suffix */
  path: z.string(),
  /** Events this integration can receive */
  events: z.array(z.string()),
  /** Secret header name for HMAC verification */
  secretHeader: z.string().optional(),
  /** Algorithm for HMAC verification */
  signatureAlgorithm: z.enum(['sha256', 'sha1']).optional(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// ============================================================================
// Integration Categories
// ============================================================================

export type IntegrationCategory =
  | 'Cloud'
  | 'Identity & Access'
  | 'HR & People'
  | 'Development'
  | 'Communication'
  | 'Monitoring'
  | 'Infrastructure'
  | 'Security'
  | 'Productivity';

// ============================================================================
// Integration Finding (result from sync/checks)
// ============================================================================

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'resolved' | 'ignored';

export interface IntegrationFinding {
  resourceType: string;
  resourceId: string;
  title: string;
  description?: string;
  severity: FindingSeverity;
  status?: FindingStatus;
  remediation?: string;
  rawPayload?: Record<string, unknown>;
}

// ============================================================================
// Check Context (passed to check run functions)
// ============================================================================

/**
 * Context object passed to check `run` functions.
 * Provides helper methods and access to credentials.
 */
export interface CheckContext {
  /** The OAuth access token (for oauth2 auth). Empty for custom auth types like AWS. */
  accessToken: string;

  /** All credentials as key-value pairs (form fields for custom auth, or token data for OAuth) */
  credentials: Record<string, string>;

  /** User-configured variables for this integration */
  variables: CheckVariableValues;

  /** Connection ID */
  connectionId: string;

  /** Organization ID */
  organizationId: string;

  /** Connection metadata (e.g., OAuth team/user info from token response) */
  metadata?: Record<string, unknown>;

  // ==================== Logging ====================

  /** Log an info message */
  log: (message: string, data?: Record<string, unknown>) => void;

  /** Log a warning */
  warn: (message: string, data?: Record<string, unknown>) => void;

  /** Log an error */
  error: (message: string, data?: Record<string, unknown>) => void;

  // ==================== Results (REQUIRED for audit trail) ====================

  /**
   * Record a passing result with evidence.
   * REQUIRED: Every resource that passes must be recorded with evidence.
   *
   * @example
   * ctx.pass({
   *   title: 'Branch protection enabled',
   *   description: 'Main branch requires 2 approving reviews',
   *   resourceType: 'repository',
   *   resourceId: 'org/repo-name',
   *   evidence: { protection: apiResponse, checkedAt: new Date() },
   * });
   */
  pass: (result: CheckPassingResult) => void;

  /**
   * Record a failing result (finding) with remediation.
   * REQUIRED: Include actionable remediation steps.
   *
   * @example
   * ctx.fail({
   *   title: 'No branch protection',
   *   description: 'Main branch allows direct pushes',
   *   resourceType: 'repository',
   *   resourceId: 'org/repo-name',
   *   severity: 'high',
   *   remediation: 'Enable branch protection in Settings > Branches',
   * });
   */
  fail: (finding: CheckFindingResult) => void;

  // Legacy aliases (deprecated, use pass/fail instead)
  /** @deprecated Use ctx.pass() instead */
  addPassingResult: (result: {
    resourceType: string;
    resourceId: string;
    title: string;
    description?: string;
    evidence?: Record<string, unknown>;
  }) => void;

  /** @deprecated Use ctx.fail() instead */
  addFinding: (finding: Omit<IntegrationFinding, 'status'>) => void;

  // ==================== HTTP Helpers ====================

  /**
   * Make an authenticated GET request
   * @example
   * const repos = await ctx.fetch<Repo[]>('/user/repos');
   */
  fetch: <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    },
  ) => Promise<T>;

  /**
   * Make an authenticated POST request
   */
  post: <T = unknown>(
    path: string,
    body?: unknown,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;

  /**
   * Make an authenticated PUT request
   */
  put: <T = unknown>(
    path: string,
    body?: unknown,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;

  /**
   * Make an authenticated PATCH request
   */
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;

  /**
   * Make an authenticated DELETE request
   */
  delete: <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;

  /**
   * Make an authenticated GraphQL request
   * @example
   * const result = await ctx.graphql<{ user: User }>(`
   *   query GetUser($login: String!) {
   *     user(login: $login) {
   *       id
   *       name
   *     }
   *   }
   * `, { login: 'octocat' });
   */
  graphql: <T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options?: {
      /** Override the GraphQL endpoint (defaults to baseUrl + '/graphql') */
      endpoint?: string;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;

  // ==================== Pagination Helpers ====================

  /**
   * Fetch all pages of a paginated endpoint (page-number based)
   * @example
   * const allRepos = await ctx.fetchAllPages<Repo>('/user/repos', { perPage: 100 });
   */
  fetchAllPages: <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      perPage?: number;
      maxPages?: number;
      pageParam?: string;
      perPageParam?: string;
    },
  ) => Promise<T[]>;

  /**
   * Fetch all pages using cursor-based pagination
   * @example
   * // Slack-style pagination
   * const messages = await ctx.fetchWithCursor<Message>('/conversations.history', {
   *   cursorParam: 'cursor',
   *   cursorPath: 'response_metadata.next_cursor',
   *   dataPath: 'messages',
   * });
   *
   * // AWS-style pagination
   * const instances = await ctx.fetchWithCursor<Instance>('/ec2/instances', {
   *   cursorParam: 'NextToken',
   *   cursorPath: 'NextToken',
   *   dataPath: 'Instances',
   * });
   */
  fetchWithCursor: <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      /** Query param name for the cursor (e.g., 'cursor', 'NextToken', 'page_token') */
      cursorParam?: string;
      /** JSON path to extract next cursor from response (e.g., 'next_cursor', 'response_metadata.next_cursor') */
      cursorPath?: string;
      /** JSON path to extract data array from response (e.g., 'data', 'items', 'messages') */
      dataPath?: string;
      /** Additional query params to include */
      params?: Record<string, string>;
      /** Maximum pages to fetch */
      maxPages?: number;
    },
  ) => Promise<T[]>;

  /**
   * Fetch all pages using Link header pagination (RFC 5988)
   * Used by GitHub, GitLab, and other APIs that follow web linking standards.
   * @example
   * const allRepos = await ctx.fetchWithLinkHeader<Repo>('/user/repos');
   * const allIssues = await ctx.fetchWithLinkHeader<Issue>('/repos/owner/repo/issues', {
   *   params: { state: 'open' }
   * });
   */
  fetchWithLinkHeader: <T = unknown>(
    path: string,
    options?: {
      baseUrl?: string;
      /** Additional query params to include */
      params?: Record<string, string>;
      /** Maximum pages to fetch (default: 100) */
      maxPages?: number;
    },
  ) => Promise<T[]>;

  // ==================== State ====================

  /** Get a value from persistent state (survives between runs) */
  getState: <T = unknown>(key: string) => Promise<T | null>;

  /** Set a value in persistent state */
  setState: <T = unknown>(key: string, value: T) => Promise<void>;
}

// ============================================================================
// Check Variables (user-configurable inputs)
// ============================================================================

export type CheckVariableType = 'text' | 'number' | 'boolean' | 'select' | 'multi-select';

/**
 * A variable that users can configure when setting up an integration.
 * Variables are collected after OAuth completes and stored on the connection.
 */
export interface CheckVariable {
  /** Unique ID for this variable */
  id: string;

  /** Display label */
  label: string;

  /** Input type */
  type: CheckVariableType;

  /** Whether this variable is required */
  required?: boolean;

  /** Default value */
  default?: string | number | boolean | string[];

  /** Help text shown below the input */
  helpText?: string;

  /** Placeholder text for text/number inputs */
  placeholder?: string;

  /**
   * Static options for select/multi-select types.
   * Use this OR fetchOptions, not both.
   */
  options?: Array<{ value: string; label: string }>;

  /**
   * Fetch options dynamically from the integration API.
   * Called after OAuth completes to populate select/multi-select options.
   *
   * @example
   * fetchOptions: async (ctx) => {
   *   const repos = await ctx.fetch<{full_name: string}[]>('/user/repos');
   *   return repos.map(r => ({ value: r.full_name, label: r.full_name }));
   * }
   */
  fetchOptions?: (ctx: VariableFetchContext) => Promise<Array<{ value: string; label: string }>>;
}

/**
 * Minimal context for fetching variable options.
 * Available after OAuth but before full check context.
 */
export interface VariableFetchContext {
  /** OAuth access token */
  accessToken: string;

  /** Make an authenticated GET request */
  fetch: <T = unknown>(path: string) => Promise<T>;

  /** Fetch all pages of a paginated endpoint */
  fetchAllPages: <T = unknown>(path: string) => Promise<T[]>;

  /** Make a GraphQL request */
  graphql: <T = unknown>(query: string, variables?: Record<string, unknown>) => Promise<T>;
}

/**
 * Resolved variable values stored on the connection.
 */
export type CheckVariableValues = Record<string, string | number | boolean | string[] | undefined>;

// ============================================================================
// Check Output Types (for structured results)
// ============================================================================

/**
 * Evidence that proves a check passed or failed.
 * This is shown to auditors as proof of compliance.
 */
export interface CheckEvidence {
  /** What was checked (e.g., "repository", "user", "policy") */
  resourceType: string;
  /** Identifier for the resource (e.g., "org/repo-name") */
  resourceId: string;
  /** Raw API response or relevant data snapshot */
  data: Record<string, unknown>;
  /** When this evidence was collected */
  collectedAt?: Date;
}

/**
 * A passing result with evidence for auditors.
 * REQUIRED: Every passing check must provide evidence.
 */
export interface CheckPassingResult {
  /** Short title describing what passed */
  title: string;
  /** Detailed explanation of why this passed (shown to auditors) */
  description: string;
  /** The resource that was checked */
  resourceType: string;
  /** Identifier for the resource */
  resourceId: string;
  /** Evidence proving this passed - REQUIRED for audit trail */
  evidence: Record<string, unknown>;
}

/**
 * A finding (issue) discovered during the check.
 */
export interface CheckFindingResult {
  /** Short title describing the issue */
  title: string;
  /** Detailed explanation of the issue */
  description: string;
  /** The resource that has the issue */
  resourceType: string;
  /** Identifier for the resource */
  resourceId: string;
  /** Severity of the finding */
  severity: FindingSeverity;
  /** How to fix this issue - REQUIRED for actionable findings */
  remediation: string;
  /** Additional evidence/context */
  evidence?: Record<string, unknown>;
}

// ============================================================================
// Integration Check Definition
// ============================================================================

export interface IntegrationCheck {
  /** Unique ID for this check */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this check does */
  description: string;

  /**
   * Task template ID this check can auto-complete.
   * When check passes, linked tasks of this type are marked complete.
   * Use TASK_TEMPLATES helper for autocomplete.
   *
   * @example
   * import { TASK_TEMPLATES } from '@comp/integration-platform';
   * taskMapping: TASK_TEMPLATES.codeChanges, // Branch protection
   * taskMapping: TASK_TEMPLATES.secureCode,  // Dependabot
   */
  taskMapping?: TaskTemplateId;

  /** Default severity for findings from this check */
  defaultSeverity?: FindingSeverity;

  /**
   * Variables that users configure when setting up this integration.
   * Collected after OAuth completes and stored on the connection.
   *
   * @example
   * variables: [
   *   {
   *     id: 'target_repos',
   *     label: 'Repositories to monitor',
   *     type: 'multi-select',
   *     required: false,
   *     helpText: 'Leave empty to check all repositories',
   *     fetchOptions: async (ctx) => {
   *       const repos = await ctx.fetch<{full_name: string}[]>('/user/repos');
   *       return repos.map(r => ({ value: r.full_name, label: r.full_name }));
   *     },
   *   },
   * ]
   */
  variables?: CheckVariable[];

  /**
   * The check implementation.
   *
   * REQUIREMENTS for check authors:
   * 1. Use ctx.log() to document what you're checking (for audit trail)
   * 2. Call ctx.pass() for each resource that passes with evidence
   * 3. Call ctx.fail() for each resource that fails with remediation
   *
   * @example
   * run: async (ctx) => {
   *   ctx.log('Fetching repositories to check');
   *   const repos = await ctx.fetchAllPages('/user/repos');
   *   ctx.log(`Checking ${repos.length} repositories`);
   *
   *   for (const repo of repos) {
   *     try {
   *       const protection = await ctx.fetch(`/repos/${repo.full_name}/branches/main/protection`);
   *
   *       // PASS: Include evidence for auditors
   *       ctx.pass({
   *         title: `Branch protection enabled on ${repo.name}`,
   *         description: 'Main branch requires PR reviews before merging',
   *         resourceType: 'repository',
   *         resourceId: repo.full_name,
   *         evidence: { protection, checkedAt: new Date().toISOString() },
   *       });
   *     } catch {
   *       // FAIL: Include remediation steps
   *       ctx.fail({
   *         title: `No branch protection on ${repo.name}`,
   *         description: 'Main branch has no protection rules',
   *         resourceType: 'repository',
   *         resourceId: repo.full_name,
   *         severity: 'high',
   *         remediation: 'Go to Settings > Branches > Add rule for "main"',
   *       });
   *     }
   *   }
   * }
   */
  run: (ctx: CheckContext) => Promise<void>;
}

// ============================================================================
// Integration Handler (for webhook processing)
// ============================================================================

export interface IntegrationCredentials {
  [key: string]: string | undefined;
}

export interface IntegrationHandler {
  /** Test if credentials are valid */
  testConnection?: (credentials: IntegrationCredentials) => Promise<boolean>;

  /** Process incoming webhook */
  handleWebhook?: (
    payload: unknown,
    headers: Record<string, string>,
  ) => Promise<IntegrationFinding[]>;
}

// ============================================================================
// Integration Manifest (the main contract)
// ============================================================================

export interface IntegrationManifest {
  /** Unique identifier (e.g., "github", "slack") */
  id: string;

  /** Display name */
  name: string;

  /** Short description for catalog */
  description: string;

  /** Category for grouping */
  category: IntegrationCategory;

  /** Logo URL (use logo.dev, e.g., 'https://img.logo.dev/github.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ') */
  logoUrl: string;

  /** URL to documentation */
  docsUrl?: string;

  /** Authentication strategy */
  auth: AuthStrategy;

  /** Base URL for API requests (used by ctx.fetch) */
  baseUrl?: string;

  /** Default headers to include in API requests */
  defaultHeaders?: Record<string, string>;

  /** Additional credential fields (beyond what auth strategy provides) */
  credentialFields?: CredentialField[];

  /** Capabilities this integration supports */
  capabilities: IntegrationCapability[];

  /**
   * Integration-level variables that are collected after authentication.
   * These can be used by checks OR by standalone features (like cloud security scanning).
   * Variables defined here are merged with check-specific variables.
   */
  variables?: CheckVariable[];

  /**
   * Compliance checks this integration can run.
   * Each check can auto-complete linked tasks when passing.
   * Checks run daily via a scheduled Trigger.dev task.
   */
  checks?: IntegrationCheck[];

  /** Webhook configuration (optional) */
  webhook?: WebhookConfig;

  /** Runtime handler for webhooks */
  handler?: IntegrationHandler;

  /** Whether this integration is active/available */
  isActive: boolean;
}

// ============================================================================
// Connection & Run Types (for persistence layer)
// ============================================================================

export type ConnectionStatus = 'pending' | 'active' | 'error' | 'paused' | 'disconnected';

export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export type RunJobType = 'full_sync' | 'delta_sync' | 'webhook' | 'manual';

// ============================================================================
// Registry Types
// ============================================================================

export interface IntegrationRegistry {
  /** Get manifest by ID */
  getManifest(id: string): IntegrationManifest | undefined;

  /** Get all manifests */
  getAllManifests(): IntegrationManifest[];

  /** Get manifests by category */
  getByCategory(category: IntegrationCategory): IntegrationManifest[];

  /** Get active manifests only */
  getActiveManifests(): IntegrationManifest[];

  /** Check if integration requires OAuth */
  requiresOAuth(id: string): boolean;

  /** Get auth strategy for integration */
  getAuthStrategy(id: string): AuthStrategy | undefined;

  /** Get handler for integration */
  getHandler(id: string): IntegrationHandler | undefined;
}
