import { ServiceUnavailableException } from '@nestjs/common';

const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ERR_STREAM_PREMATURE_CLOSE',
]);

const RETRYABLE_MESSAGE_PARTS = [
  'premature close',
  'socket hang up',
  'fetch failed',
  'network timeout',
  'timeout',
  'temporarily unavailable',
];

const readStringProperty = ({
  value,
  property,
}: {
  value: unknown;
  property: string;
}): string | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  if (!(property in value)) return undefined;
  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === 'string' ? propertyValue : undefined;
};

const readNumberProperty = ({
  value,
  property,
}: {
  value: unknown;
  property: string;
}): number | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  if (!(property in value)) return undefined;
  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === 'number' ? propertyValue : undefined;
};

export const getBrowserbaseErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
};

export const isRetryableBrowserbaseUpstreamError = (
  error: unknown,
): boolean => {
  const code =
    readStringProperty({ value: error, property: 'code' }) ??
    readStringProperty({ value: error, property: 'errno' });
  if (code && RETRYABLE_ERROR_CODES.has(code)) return true;

  const status =
    readNumberProperty({ value: error, property: 'status' }) ??
    readNumberProperty({ value: error, property: 'statusCode' });
  if (status && (status === 429 || status >= 500)) return true;

  const message = getBrowserbaseErrorText(error).toLowerCase();
  return RETRYABLE_MESSAGE_PARTS.some((part) => message.includes(part));
};

export const browserbaseUnavailableException = () =>
  new ServiceUnavailableException(
    'Browserbase is temporarily unavailable. Please retry in a moment.',
  );
