/**
 * Skip rule configuration for sensitive logs
 */
type SkipRule = {
  field: string;
  value: unknown;
  reason?: string; // Optional reason for documentation
};

/**
 * Default skip rules for sensitive log filtering.
 * Add or modify rules here to control which logs are skipped.
 *
 * Rules:
 * - Use exact value match: { field: 'cloudProvider', value: 'gcp' }
 * - Use wildcard '*' to skip if field exists regardless of value: { field: 'apiKey', value: '*' }
 */
const DEFAULT_SKIP_RULES: SkipRule[] = [
  {
    field: 'cloudProvider',
    value: 'gcp',
    reason: 'May contain credentials',
  },
  // Add more skip rules here as needed:
  // {
  //   field: 'apiKey',
  //   value: '*', // Use '*' to skip if field exists regardless of value
  //   reason: 'Contains sensitive API key',
  // },
  // {
  //   field: 'password',
  //   value: '*',
  //   reason: 'Contains password',
  // },
];

/**
 * Validator layer that checks if logs should be skipped based on configured rules.
 * Optimized to avoid unnecessary JSON stringification - uses direct property access.
 */
class LoggerValidatorLayer {
  private skipRules: SkipRule[];

  constructor(skipRules: SkipRule[] = []) {
    this.skipRules = skipRules;
  }

  /**
   * Add a new skip rule to the validator
   */
  addRule(rule: SkipRule): void {
    this.skipRules.push(rule);
  }

  /**
   * Add multiple skip rules at once
   */
  addRules(rules: SkipRule[]): void {
    this.skipRules.push(...rules);
  }

  /**
   * Remove a skip rule by field name
   */
  removeRule(field: string): void {
    this.skipRules = this.skipRules.filter((rule) => rule.field !== field);
  }

  /**
   * Get all configured skip rules
   */
  getRules(): ReadonlyArray<SkipRule> {
    return this.skipRules;
  }

  /**
   * Checks if logging should be skipped based on configured rules
   * Optimized to avoid unnecessary JSON stringification - uses direct property access
   */
  shouldSkip(params: unknown): boolean {
    // Fast path: if not an object, don't skip
    if (!params || typeof params !== 'object') {
      return false;
    }

    const obj = params as Record<string, unknown>;

    // Check each skip rule
    for (const rule of this.skipRules) {
      // Fast path: check if the field exists using 'in' operator (O(1))
      if (rule.field in obj) {
        // If value is '*', skip if field exists regardless of value
        if (rule.value === '*') {
          return true;
        }
        // Otherwise, check if the value matches
        if (obj[rule.field] === rule.value) {
          return true;
        }
      }
    }

    return false;
  }
}

// Initialize validator with default skip rules
const loggerValidator = new LoggerValidatorLayer(DEFAULT_SKIP_RULES);

/**
 * Safely formats params for logging.
 * Handles edge cases like circular references and BigInt that would throw in JSON.stringify.
 */
const formatParams = (params: unknown): unknown => {
  if (!params) {
    return '';
  }

  if (typeof params !== 'object') {
    return params;
  }

  try {
    return JSON.stringify(params, null, 2);
  } catch {
    // Fallback for circular references, BigInt, or other non-serializable values
    // Return the raw object - console.log handles these natively
    return params;
  }
};

export const logger = {
  info: (message: string, params?: unknown) => {
    // Skip logging if it matches any skip rule
    if (loggerValidator.shouldSkip(params)) {
      return;
    }
    // Pass message as separate argument to avoid format string injection
    console.log('[INFO]', message, formatParams(params));
  },
  warn: (message: string, params?: unknown) => {
    // Skip logging if it matches any skip rule
    if (loggerValidator.shouldSkip(params)) {
      return;
    }
    // Pass message as separate argument to avoid format string injection
    console.warn('[WARN]', message, formatParams(params));
  },
  error: (message: string, params?: unknown) => {
    // Skip logging if it matches any skip rule
    if (loggerValidator.shouldSkip(params)) {
      return;
    }
    // Pass message as separate argument to avoid format string injection
    console.error('[ERROR]', message, formatParams(params));
  },
};

// Export the validator class for advanced usage if needed
export { LoggerValidatorLayer };
