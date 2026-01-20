'use server';

import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const ERROR_SANITIZATION_SYSTEM_PROMPT = `Transform error messages into friendly, helpful guidance. Hide any sensitive data.

RULES:
1. Write in simple, friendly language (not technical jargon)
2. Explain what went wrong and HOW TO FIX it
3. NEVER show: API keys, tokens, passwords, secrets, connection strings, internal paths, IPs
4. Keep error types (TypeError, SyntaxError) - they help debugging
5. If error is already clear and safe, return it unchanged

EXAMPLES:

INPUT: "Failed to authenticate with key: sk_live_abc123xyz"
OUTPUT: "Authentication failed. Please check that your API key is correct and hasn't expired."

INPUT: "Connection to postgres://user:pass@db.example.com failed: ETIMEDOUT"
OUTPUT: "Unable to connect to the database. Please verify your database credentials are correct and the database server is accessible."

INPUT: "TypeError: Cannot read property 'data' of undefined"
OUTPUT: "The API response was missing expected data. Please check that the API endpoint is correct and returning the expected format."

INPUT: "Invalid regular expression: missing /"
OUTPUT: "Invalid regular expression: missing /"

INPUT: "Internal Server Error"
OUTPUT: "Something went wrong while running your automation. Please check your script for any syntax errors or incorrect API configurations."

INPUT: "Request failed with status 401"
OUTPUT: "Access denied (401). Please verify your credentials or API key have the required permissions."

INPUT: "Request failed with status 404"
OUTPUT: "The requested resource was not found (404). Please check that the URL or endpoint in your script is correct."

INPUT: "Request failed with status 429"
OUTPUT: "Too many requests (429). The API rate limit was exceeded. Please wait a moment and try again, or reduce the frequency of requests."

INPUT: "ENOTFOUND api.example.com"
OUTPUT: "Could not reach the server. Please check your internet connection and verify the API URL is correct."

Return ONLY the friendly error message.`;

/**
 * Extract the most detailed error message from various error formats.
 * Prioritizes detailed messages over generic ones.
 */
const extractRawError = (err: unknown): string => {
  if (!err) return '';

  // If it's a string, use it directly
  if (typeof err === 'string') return err;

  // If it's an Error object
  if (err instanceof Error) return err.message;

  // If it's an object, try to extract the most detailed error
  if (typeof err === 'object') {
    const errObj = err as Record<string, unknown>;

    // Prioritize detailed error messages over generic ones
    const genericMessages = [
      'internal server error',
      'task execution failed',
      'an error occurred',
      'something went wrong',
      'unknown error',
    ];

    // Try various error properties, preferring detailed ones
    const candidates: string[] = [];

    if (typeof errObj.message === 'string') candidates.push(errObj.message);
    if (typeof errObj.error === 'string') candidates.push(errObj.error);
    if (typeof errObj.details === 'string') candidates.push(errObj.details);
    if (typeof errObj.reason === 'string') candidates.push(errObj.reason);
    if (typeof errObj.cause === 'string') candidates.push(errObj.cause);

    // Find the first non-generic message
    for (const candidate of candidates) {
      const isGeneric = genericMessages.some((generic) =>
        candidate.toLowerCase().includes(generic),
      );
      if (!isGeneric && candidate.length > 0) {
        return candidate;
      }
    }

    // If all are generic, return the first one that exists
    for (const candidate of candidates) {
      if (candidate.length > 0) return candidate;
    }

    // Last resort: try to stringify
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}') return str;
    } catch {
      // Ignore stringify errors
    }
  }

  return '';
};

/**
 * Sanitize an error message using AI to make it user-friendly
 * and remove any sensitive information.
 *
 * Uses deterministic settings (temperature: 0) for consistent results.
 */
export const sanitizeErrorMessage = async (rawError: unknown): Promise<string> => {
  const errorString = extractRawError(rawError);

  // If we couldn't extract any error, return a generic message
  if (!errorString) {
    return 'The automation encountered an unexpected error. Please check your script and try again.';
  }

  // Always use AI to make errors user-friendly and hide sensitive data
  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: ERROR_SANITIZATION_SYSTEM_PROMPT,
      prompt: errorString,
      temperature: 0, // Deterministic output
      maxRetries: 1,
    });

    return text.trim() || 'The automation encountered an error. Please check your script and try again.';
  } catch (aiError) {
    // If AI fails, fall back to basic sanitization
    console.error('[sanitizeErrorMessage] AI sanitization failed:', aiError);

    // Basic regex-based sanitization as fallback
    let sanitized = errorString
      // Remove potential API keys and tokens
      .replace(/([a-zA-Z_]*(?:key|token|secret|password|api_key|apikey|authorization)[a-zA-Z_]*[=:\s]+)['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi, '$1[REDACTED]')
      // Remove Bearer tokens
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      // Remove connection strings
      .replace(/(mongodb|postgres|mysql|redis|amqp):\/\/[^\s]+/gi, '$1://[REDACTED]')
      // Remove AWS keys
      .replace(/AKIA[A-Z0-9]{16}/g, '[AWS_KEY_REDACTED]')
      // Remove long hex strings that look like secrets
      .replace(/['"][a-f0-9]{32,}['"]/gi, '"[REDACTED]"')
      // Remove URLs with credentials
      .replace(/:\/\/[^:]+:[^@]+@/g, '://[CREDENTIALS_REDACTED]@');

    return sanitized || 'The automation encountered an error. Please check your script and try again.';
  }
};
