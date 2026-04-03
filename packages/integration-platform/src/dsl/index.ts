// DSL Engine — Declarative check and sync definitions
export { interpretDeclarativeCheck, interpretDeclarativeSync } from './interpreter';
export { evaluateCondition, evaluateOperator, resolvePath } from './expression-evaluator';
export { interpolate, interpolateTemplate } from './template-engine';
export { validateIntegrationDefinition, type ValidationResult } from './validate';

// Types
export type {
  DSLStep,
  FetchStep,
  FetchPagesStep,
  ForEachStep,
  AggregateStep,
  BranchStep,
  EmitStep,
  CodeStep,
  CheckDefinition,
  SyncEmployee,
  SyncDefinition,
  Condition,
  FieldCondition,
  LogicalCondition,
  ComparisonOperator,
  ResultTemplate,
  PaginationConfig,
  DynamicIntegrationDefinition,
} from './types';

// Zod schemas
export {
  DSLStepSchema,
  CheckDefinitionSchema,
  SyncEmployeeSchema,
  SyncDefinitionSchema,
  DynamicIntegrationDefinitionSchema,
  ConditionSchema,
  ResultTemplateSchema,
  PaginationConfigSchema,
  CodeStepSchema,
} from './types';
