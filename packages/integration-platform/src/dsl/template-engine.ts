import { resolvePath } from './expression-evaluator';

/**
 * Interpolates {{variable}} placeholders in a string against the scope.
 *
 * Supported patterns:
 * - {{user.email}} — resolved from scope
 * - {{variables.threshold}} — resolved from scope.variables
 * - {{now}} — current ISO timestamp
 *
 * Unresolved variables are left as empty strings.
 */
export function interpolate(
  template: string,
  scope: Record<string, unknown>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const trimmedPath = path.trim();

    // Special built-in variables
    if (trimmedPath === 'now') {
      return new Date().toISOString();
    }

    const value = resolvePath(scope, trimmedPath);

    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Interpolates all string values in a result template object.
 * Non-string values are passed through unchanged.
 */
export function interpolateTemplate<T extends Record<string, unknown>>(
  template: T,
  scope: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      result[key] = interpolate(value, scope);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = interpolateTemplate(value as Record<string, unknown>, scope);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
