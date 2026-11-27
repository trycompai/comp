import type { CaptureResult } from 'posthog-js';

/**
 * URL schemes that browser extensions inject scripts under. Anything in a
 * stack trace pointing at one of these did not originate from our code.
 */
const EXTENSION_URL_SCHEMES = [
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'safari-web-extension://',
  'ms-browser-extension://',
] as const;

/**
 * Error messages produced by the WebExtension messaging APIs
 * (`runtime.sendMessage`, `runtime.connect`, ...). These are thrown by
 * third-party extensions running in the page, never by our own code — we
 * don't ship any `chrome.runtime` / `browser.runtime` usage.
 *
 * Example: "Invalid call to runtime.sendMessage(). Tab not found."
 */
const EXTENSION_MESSAGE_PATTERNS = [
  'runtime.sendmessage',
  'runtime.connect',
  'chrome.runtime',
  'browser.runtime',
  'extension context invalidated',
  'could not establish connection. receiving end does not exist',
  'the message port closed before a response was received',
] as const;

interface StackFrame {
  filename?: unknown;
}

interface ExceptionListItem {
  value?: unknown;
  stacktrace?: {
    frames?: unknown;
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function containsExtensionScheme(text: string): boolean {
  const lower = text.toLowerCase();
  return EXTENSION_URL_SCHEMES.some((scheme) => lower.includes(scheme));
}

function matchesExtensionMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return EXTENSION_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function frameIsFromExtension(frame: unknown): boolean {
  if (typeof frame !== 'object' || frame === null) {
    return false;
  }
  return containsExtensionScheme(asString((frame as StackFrame).filename));
}

function exceptionIsFromExtension(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const { value, stacktrace } = item as ExceptionListItem;

  if (matchesExtensionMessage(asString(value))) {
    return true;
  }

  const frames = stacktrace?.frames;
  return Array.isArray(frames) && frames.some(frameIsFromExtension);
}

/**
 * Returns true when a captured `$exception` event was injected by a browser
 * extension rather than thrown by our application code.
 */
export function isBrowserExtensionException(event: CaptureResult): boolean {
  if (event.event !== '$exception') {
    return false;
  }

  const properties = event.properties ?? {};

  const exceptionList = properties.$exception_list;
  if (Array.isArray(exceptionList) && exceptionList.some(exceptionIsFromExtension)) {
    return true;
  }

  // Fall back to the flat message property some SDK paths populate.
  return matchesExtensionMessage(asString(properties.$exception_message));
}

/**
 * PostHog `before_send` hook that drops browser-extension exception noise
 * (e.g. WebExtension `runtime.sendMessage` "Tab not found" errors) so it never
 * reaches error tracking. All other events pass through untouched.
 */
export function dropBrowserExtensionExceptions(event: CaptureResult | null): CaptureResult | null {
  if (event && isBrowserExtensionException(event)) {
    return null;
  }
  return event;
}
