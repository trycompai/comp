import type { Condition, FieldCondition, ComparisonOperator } from './types';

/**
 * Resolves a dot-notation path against a scope object.
 * Supports nested access like "user.profile.email" and array indexing like "items.0.name"
 */
export function resolvePath(scope: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = scope;

  for (const part of parts) {
    if (current == null) return undefined;

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Evaluates a single field condition against the scope.
 */
function evaluateFieldCondition(
  condition: FieldCondition,
  scope: Record<string, unknown>,
): boolean {
  const fieldValue = resolvePath(scope, condition.field);
  const compareValue = condition.value;

  return evaluateOperator(condition.operator, fieldValue, compareValue);
}

/**
 * Evaluates a comparison operator against field and compare values.
 */
export function evaluateOperator(
  operator: ComparisonOperator,
  fieldValue: unknown,
  compareValue: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === compareValue;

    case 'neq':
      return fieldValue !== compareValue;

    case 'gt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue > compareValue
        : false;

    case 'gte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue >= compareValue
        : false;

    case 'lt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue < compareValue
        : false;

    case 'lte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue <= compareValue
        : false;

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;

    case 'notExists':
      return fieldValue === undefined || fieldValue === null;

    case 'truthy':
      return !!fieldValue;

    case 'falsy':
      return !fieldValue;

    case 'contains':
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;

    case 'matches':
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        try {
          return new RegExp(compareValue).test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    case 'in':
      if (Array.isArray(compareValue)) {
        return compareValue.includes(fieldValue);
      }
      return false;

    case 'age_within_days': {
      if (typeof compareValue !== 'number') return false;
      const date = parseDate(fieldValue);
      if (!date) return false;
      const diffMs = Date.now() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= compareValue;
    }

    case 'age_exceeds_days': {
      if (typeof compareValue !== 'number') return false;
      const date = parseDate(fieldValue);
      if (!date) return false;
      const diffMs = Date.now() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > compareValue;
    }

    default:
      return false;
  }
}

/**
 * Parse a value as a Date. Supports ISO strings and epoch timestamps.
 */
function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    // Assume epoch ms if > 1e10, else epoch seconds
    const ms = value > 1e10 ? value : value * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Evaluates a condition (field or logical) against the scope.
 * Supports nested `and`, `or`, `not` operators.
 */
export function evaluateCondition(
  condition: Condition,
  scope: Record<string, unknown>,
): boolean {
  // Logical operators
  if ('op' in condition) {
    switch (condition.op) {
      case 'and':
        return condition.conditions.every((c) => evaluateCondition(c, scope));
      case 'or':
        return condition.conditions.some((c) => evaluateCondition(c, scope));
      case 'not':
        return !evaluateCondition(condition.condition, scope);
      default:
        return false;
    }
  }

  // Field condition
  return evaluateFieldCondition(condition as FieldCondition, scope);
}
