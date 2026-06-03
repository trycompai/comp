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
