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

    if (value instanceof Map) {
      return Array.from(value.entries()).map(([key, mapValue]) => [
        key,
        redact(mapValue),
      ]);
    }

    if (value instanceof Set) {
      return Array.from(value.values()).map((item) => redact(item));
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    if (Array.isArray(value)) {
      const redactedArray = value.map((item) => redact(item));
      seen.set(value, redactedArray);
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
