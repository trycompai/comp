/**
 * Shared credential utility functions for normalizing credential values
 * across controllers that handle integration credentials.
 */

/**
 * Extracts a single string value from a credential that may be string or string[]
 * @param value - The credential value which may be string or string[]
 * @returns The first string value, or undefined if no value exists
 */
export function getStringValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Normalizes credentials from Record<string, string | string[]> to Record<string, string>
 * by extracting the first value from arrays
 * @param credentials - The credentials object with potential array values
 * @returns A normalized credentials object with only string values
 */
export function toStringCredentials(
  credentials: Record<string, string | string[]>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    const stringValue = getStringValue(value);
    if (typeof stringValue === 'string' && stringValue.length > 0) {
      normalized[key] = stringValue;
    }
  }
  return normalized;
}
