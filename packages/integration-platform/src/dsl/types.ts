import { z } from 'zod';

// ============================================================================
// Expression Operators
// ============================================================================

export const ComparisonOperator = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'exists',
  'notExists',
  'truthy',
  'falsy',
  'contains',
  'matches',
  'in',
  'age_within_days',
  'age_exceeds_days',
]);

export type ComparisonOperator = z.infer<typeof ComparisonOperator>;

// ============================================================================
// Condition Schema
// ============================================================================

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({
      field: z.string(),
      operator: ComparisonOperator,
      value: z.unknown().optional(),
    }),
    z.object({
      op: z.literal('and'),
      conditions: z.array(ConditionSchema),
    }),
    z.object({
      op: z.literal('or'),
      conditions: z.array(ConditionSchema),
    }),
    z.object({
      op: z.literal('not'),
      condition: ConditionSchema,
    }),
  ]),
);

export type FieldCondition = {
  field: string;
  operator: ComparisonOperator;
  value?: unknown;
};

export type LogicalCondition =
  | { op: 'and'; conditions: Condition[] }
  | { op: 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition };

export type Condition = FieldCondition | LogicalCondition;

// ============================================================================
// Result Template
// ============================================================================

export const ResultTemplateSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  resourceType: z.string(),
  resourceId: z.string(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  remediation: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export type ResultTemplate = z.infer<typeof ResultTemplateSchema>;

// ============================================================================
// Pagination Config
// ============================================================================

export const PaginationConfigSchema = z.discriminatedUnion('strategy', [
  z.object({
    strategy: z.literal('cursor'),
    cursorParam: z.string(),
    cursorPath: z.string(),
    dataPath: z.string(),
    params: z.record(z.string(), z.string()).optional(),
    maxPages: z.number().optional(),
  }),
  z.object({
    strategy: z.literal('page'),
    pageParam: z.string().optional(),
    perPageParam: z.string().optional(),
    perPage: z.number().optional(),
    dataPath: z.string().optional(),
    maxPages: z.number().optional(),
  }),
  z.object({
    strategy: z.literal('link'),
    params: z.record(z.string(), z.string()).optional(),
    maxPages: z.number().optional(),
  }),
]);

export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;

// ============================================================================
// DSL Step Types
// ============================================================================

export const FetchStepSchema = z.object({
  type: z.literal('fetch'),
  path: z.string(),
  as: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  params: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  dataPath: z.string().optional(),
  onError: z.enum(['fail', 'skip', 'empty']).optional(),
});

export type FetchStep = z.infer<typeof FetchStepSchema>;

export const FetchPagesStepSchema = z.object({
  type: z.literal('fetchPages'),
  path: z.string(),
  as: z.string(),
  pagination: PaginationConfigSchema,
  params: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  onError: z.enum(['fail', 'skip', 'empty']).optional(),
});

export type FetchPagesStep = z.infer<typeof FetchPagesStepSchema>;

export const ForEachStepSchema: z.ZodType<ForEachStep> = z.lazy(() =>
  z.object({
    type: z.literal('forEach'),
    collection: z.string(),
    itemAs: z.string(),
    resourceType: z.string(),
    resourceIdPath: z.string(),
    filter: ConditionSchema.optional(),
    conditions: z.array(ConditionSchema),
    onPass: ResultTemplateSchema,
    onFail: ResultTemplateSchema,
    steps: z.array(DSLStepSchema).optional(),
  }),
);

export type ForEachStep = {
  type: 'forEach';
  collection: string;
  itemAs: string;
  resourceType: string;
  resourceIdPath: string;
  filter?: Condition;
  conditions: Condition[];
  onPass: ResultTemplate;
  onFail: ResultTemplate;
  steps?: DSLStep[];
};

export const AggregateStepSchema = z.object({
  type: z.literal('aggregate'),
  collection: z.string(),
  operation: z.enum(['count', 'countWhere', 'sum', 'avg', 'min', 'max']),
  field: z.string().optional(),
  filter: ConditionSchema.optional(),
  as: z.string().optional(),
  condition: z.object({
    operator: ComparisonOperator,
    value: z.unknown(),
  }),
  onPass: ResultTemplateSchema,
  onFail: ResultTemplateSchema,
});

export type AggregateStep = z.infer<typeof AggregateStepSchema>;

export const BranchStepSchema: z.ZodType<BranchStep> = z.lazy(() =>
  z.object({
    type: z.literal('branch'),
    condition: ConditionSchema,
    then: z.array(DSLStepSchema),
    else: z.array(DSLStepSchema).optional(),
  }),
);

export type BranchStep = {
  type: 'branch';
  condition: Condition;
  then: DSLStep[];
  else?: DSLStep[];
};

export const EmitStepSchema = z.object({
  type: z.literal('emit'),
  result: z.enum(['pass', 'fail']),
  template: ResultTemplateSchema,
});

export type EmitStep = z.infer<typeof EmitStepSchema>;

export const CodeStepSchema = z.object({
  type: z.literal('code'),
  code: z.string().min(1),
});

export type CodeStep = z.infer<typeof CodeStepSchema>;

// ============================================================================
// Union of All Steps
// ============================================================================

export const DSLStepSchema: z.ZodType<DSLStep> = z.lazy(() =>
  z.union([
    FetchStepSchema,
    FetchPagesStepSchema,
    ForEachStepSchema,
    AggregateStepSchema,
    BranchStepSchema,
    EmitStepSchema,
    CodeStepSchema,
  ]),
);

export type DSLStep =
  | FetchStep
  | FetchPagesStep
  | ForEachStep
  | AggregateStep
  | BranchStep
  | EmitStep
  | CodeStep;

// ============================================================================
// Shared Variable Schema (used by checks, sync, and integration definitions)
// ============================================================================

export const VariableSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'boolean', 'select', 'multi-select']),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  helpText: z.string().optional(),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
});

// ============================================================================
// Check Definition (the top-level DSL object)
// ============================================================================

export const CheckDefinitionSchema = z.object({
  steps: z.array(DSLStepSchema),
  variables: z.array(VariableSchema).optional(),
});

export type CheckDefinition = z.infer<typeof CheckDefinitionSchema>;

// ============================================================================
// Sync Definition (for dynamic employee sync)
// ============================================================================

export const SyncEmployeeSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  externalId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  role: z.string().optional(),
  department: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SyncEmployee = z.infer<typeof SyncEmployeeSchema>;

export const SyncDefinitionSchema = z.object({
  steps: z.array(DSLStepSchema),
  employeesPath: z.string().default('employees'),
  variables: z.array(VariableSchema).optional(),
});

export type SyncDefinition = z.infer<typeof SyncDefinitionSchema>;

// ============================================================================
// Dynamic Integration Definition (full manifest + checks as JSON)
// ============================================================================

export const DynamicIntegrationDefinitionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    'Cloud',
    'Identity & Access',
    'HR & People',
    'Development',
    'Communication',
    'Monitoring',
    'Infrastructure',
    'Security',
    'Productivity',
  ]),
  logoUrl: z.string().url(),
  docsUrl: z.string().url().optional(),
  baseUrl: z.string().url().optional(),
  defaultHeaders: z.record(z.string(), z.string()).optional(),
  authConfig: z.object({
    type: z.enum(['oauth2', 'api_key', 'basic', 'jwt', 'custom']),
    config: z.record(z.string(), z.unknown()),
  }),
  capabilities: z.array(z.enum(['checks', 'webhook', 'sync'])).default(['checks']),
  supportsMultipleConnections: z.boolean().optional(),
  syncDefinition: SyncDefinitionSchema.optional(),
  checks: z.array(
    z.object({
      checkSlug: z.string().regex(/^[a-z0-9_]+$/, 'Check slug must be lowercase alphanumeric with underscores'),
      name: z.string().min(1),
      description: z.string().min(1),
      taskMapping: z.string().optional(),
      defaultSeverity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
      definition: CheckDefinitionSchema,
      variables: z.array(VariableSchema)
        .optional(),
      isEnabled: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }),
  ),
});

export type DynamicIntegrationDefinition = z.infer<
  typeof DynamicIntegrationDefinitionSchema
>;
