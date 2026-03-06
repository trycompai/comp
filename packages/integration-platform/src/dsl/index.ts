// DSL Engine — Declarative check definitions
export { interpretDeclarativeCheck } from './interpreter';
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
  CheckDefinition,
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
  DynamicIntegrationDefinitionSchema,
  ConditionSchema,
  ResultTemplateSchema,
  PaginationConfigSchema,
} from './types';
