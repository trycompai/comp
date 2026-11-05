import type { CaptureResult } from 'posthog-js';
import { describe, expect, it } from 'vitest';
import { dropBrowserExtensionExceptions, isBrowserExtensionException } from './before-send';

function exceptionEvent(properties: Record<string, unknown>): CaptureResult {
  return {
    event: '$exception',
    properties,
  } as CaptureResult;
}

describe('isBrowserExtensionException', () => {
  it('flags the runtime.sendMessage "Tab not found" noise from the report', () => {
    const event = exceptionEvent({
      $exception_list: [
        {
          type: 'Error',
          value: 'Invalid call to runtime.sendMessage(). Tab not found.',
        },
      ],
    });

    expect(isBrowserExtensionException(event)).toBe(true);
  });

  it('flags exceptions whose stack frames come from an extension scheme', () => {
    const event = exceptionEvent({
      $exception_list: [
        {
          type: 'TypeError',
          value: 'undefined is not an object',
          stacktrace: {
            frames: [{ filename: 'chrome-extension://abc123/content.js' }],
          },
        },
      ],
    });

    expect(isBrowserExtensionException(event)).toBe(true);
  });

  it('flags safari web extension frames', () => {
    const event = exceptionEvent({
      $exception_list: [
        {
          value: 'boom',
          stacktrace: {
            frames: [{ filename: 'safari-web-extension://XYZ/injected.js' }],
          },
        },
      ],
    });

    expect(isBrowserExtensionException(event)).toBe(true);
  });

  it('flags the flat $exception_message fallback', () => {
    const event = exceptionEvent({
      $exception_message: 'Extension context invalidated.',
    });

    expect(isBrowserExtensionException(event)).toBe(true);
  });

  it('does not flag genuine application exceptions', () => {
    const event = exceptionEvent({
      $exception_list: [
        {
          type: 'Error',
          value: 'Cannot read properties of null (reading "id")',
          stacktrace: {
            frames: [{ filename: 'https://www.trycomp.ai/_next/static/chunk.js' }],
          },
        },
      ],
    });

    expect(isBrowserExtensionException(event)).toBe(false);
  });

  it('ignores non-exception events entirely', () => {
    const event = {
      event: '$pageview',
      properties: {
        $exception_message: 'runtime.sendMessage failed',
      },
    } as CaptureResult;

    expect(isBrowserExtensionException(event)).toBe(false);
  });

  it('handles missing / malformed properties without throwing', () => {
    expect(isBrowserExtensionException(exceptionEvent({}))).toBe(false);
    expect(
      isBrowserExtensionException(
        exceptionEvent({ $exception_list: 'not-an-array' }),
      ),
    ).toBe(false);
    expect(
      isBrowserExtensionException(exceptionEvent({ $exception_list: [null, 42] })),
    ).toBe(false);
  });
});

describe('dropBrowserExtensionExceptions', () => {
  it('drops extension noise by returning null', () => {
    const event = exceptionEvent({
      $exception_list: [{ value: 'Invalid call to runtime.sendMessage(). Tab not found.' }],
    });

    expect(dropBrowserExtensionExceptions(event)).toBeNull();
  });

  it('passes real exceptions through untouched', () => {
    const event = exceptionEvent({
      $exception_list: [{ value: 'Real app error' }],
    });

    expect(dropBrowserExtensionExceptions(event)).toBe(event);
  });

  it('passes non-exception events through untouched', () => {
    const event = { event: '$pageview', properties: {} } as CaptureResult;

    expect(dropBrowserExtensionExceptions(event)).toBe(event);
  });

  it('handles a null event', () => {
    expect(dropBrowserExtensionExceptions(null)).toBeNull();
  });
});
