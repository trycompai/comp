import type { Response } from 'express';

/**
 * Sanitizes a string to prevent XSS attacks when sent via SSE
 * Removes potentially dangerous HTML/script content
 */
function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Recursively sanitizes all string values in an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Creates a safe SSE sender function that sanitizes data before sending
 * This prevents XSS attacks from user-provided or error message content
 */
export function createSafeSSESender(res: Response) {
  return (data: object) => {
    // Sanitize all string values in the data to prevent XSS
    const sanitizedData = sanitizeObject(data);
    res.write(`data: ${JSON.stringify(sanitizedData)}\n\n`);
  };
}

/**
 * Sanitizes an error message for safe inclusion in SSE responses
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return sanitizeString(message);
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

