import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;

export function verifyBackgroundCheckWebhookSignature({
  rawBody,
  headers,
}: {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}): void {
  const secret = process.env.BACKGROUND_CHECK_WEBHOOK_SECRET;
  if (!secret) {
    throw new UnauthorizedException('Webhook secret is not configured.');
  }

  const timestampHeader = headerValue(headers, 'x-background-check-timestamp');
  const signature = headerValue(headers, 'x-background-check-signature');
  if (!timestampHeader || !signature) {
    throw new UnauthorizedException('Missing webhook signature headers.');
  }

  const timestamp = Number(timestampHeader);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > WEBHOOK_MAX_SKEW_MS
  ) {
    throw new UnauthorizedException('Webhook timestamp is invalid.');
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody.toString('utf8')}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  const matches =
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer);

  if (!matches) {
    throw new UnauthorizedException('Invalid webhook signature.');
  }
}

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
