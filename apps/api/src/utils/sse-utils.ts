import type { Response } from 'express';

/**
 * Escapes special characters in JSON strings using Unicode escapes.
 * This prevents potential XSS if JSON is ever interpreted as HTML,
 * while keeping the JSON valid.
 *
 * JSON.stringify handles standard JSON escaping, but doesn't escape
 * <, >, & which could be problematic if the response is misinterpreted.
 */
function escapeJsonString(jsonStr: string): string {
  return jsonStr
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Creates a safe SSE sender function.
 *
 * Security measures:
 * 1. JSON.stringify handles escaping for JSON context
 * 2. Unicode escapes for <, >, & prevent HTML interpretation
 * 3. Content-Type: text/event-stream prevents browser HTML rendering
 * 4. X-Content-Type-Options: nosniff prevents MIME sniffing
 */
export function createSafeSSESender(res: Response) {
  return (data: object) => {
    // JSON.stringify provides safe JSON encoding
    // Additional unicode escapes for <, >, & as defense-in-depth
    const jsonData = escapeJsonString(JSON.stringify(data));
    res.write(`data: ${jsonData}\n\n`);
  };
}

/**
 * Sanitizes an error message for safe inclusion in responses.
 * Uses Unicode escapes instead of HTML entities to keep the message
 * valid for JSON contexts while preventing XSS.
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  // Use unicode escapes for safety (same as escapeJsonString but for plain strings)
  return message
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Sets up SSE headers on a response object
 */
export function setupSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  (res as Response & { flushHeaders?: () => void }).flushHeaders?.();
}
