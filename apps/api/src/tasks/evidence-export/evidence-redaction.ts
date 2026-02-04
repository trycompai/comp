/**
 * Evidence Redaction
 * Redacts sensitive values from evidence data while preserving structure.
 */

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'passphrase',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'client_secret',
  'authorization',
  'cookie',
  'set-cookie',
  'private_key',
  'ssh_key',
  'bearer',
  'session',
  'sessionid',
];

const DEFAULT_VALUE_PATTERNS: RegExp[] = [
  /^Bearer\s+[A-Za-z0-9\-_.=]+$/i,
  /^eyJ[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+$/,
  /^sk_(live|test)_/i,
  /^gh[pousr]_/i,
];

interface RedactionOptions {
  redactKeys?: string[];
  redactValuePatterns?: RegExp[];
}

function isSensitiveKey(key: string, sensitiveKeys: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey));
}

function shouldRedactValue(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function redactSensitiveData(
  data: unknown,
  options: RedactionOptions = {},
): unknown {
  const sensitiveKeys = options.redactKeys ?? DEFAULT_SENSITIVE_KEYS;
  const valuePatterns = options.redactValuePatterns ?? DEFAULT_VALUE_PATTERNS;
  const seen = new WeakMap<object, unknown>();

  function redact(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return shouldRedactValue(value, valuePatterns) ? '[REDACTED]' : value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date || value instanceof Error) {
      return value;
    }

    // Check for circular references BEFORE processing any object type
    if (seen.has(value)) {
      return '[Circular]';
    }

    if (value instanceof Map) {
      const result: [unknown, unknown][] = [];
      seen.set(value, result);
      for (const [key, mapValue] of value.entries()) {
        // Check if the key is sensitive (only for string keys)
        if (typeof key === 'string' && isSensitiveKey(key, sensitiveKeys)) {
          result.push([key, '[REDACTED]']);
        } else if (
          typeof mapValue === 'string' &&
          shouldRedactValue(mapValue, valuePatterns)
        ) {
          result.push([key, '[REDACTED]']);
        } else {
          result.push([key, redact(mapValue)]);
        }
      }
      return result;
    }

    if (value instanceof Set) {
      const result: unknown[] = [];
      seen.set(value, result);
      for (const item of value.values()) {
        result.push(redact(item));
      }
      return result;
    }

    if (Array.isArray(value)) {
      const redactedArray: unknown[] = [];
      seen.set(value, redactedArray);
      for (const item of value) {
        redactedArray.push(redact(item));
      }
      return redactedArray;
    }

    const redactedObject: Record<string, unknown> = {};
    seen.set(value, redactedObject);

    for (const [key, objectValue] of Object.entries(value)) {
      if (isSensitiveKey(key, sensitiveKeys)) {
        redactedObject[key] = '[REDACTED]';
        continue;
      }

      if (typeof objectValue === 'string') {
        redactedObject[key] = shouldRedactValue(objectValue, valuePatterns)
          ? '[REDACTED]'
          : objectValue;
        continue;
      }

      redactedObject[key] = redact(objectValue);
    }

    return redactedObject;
  }

  return redact(data);
}
