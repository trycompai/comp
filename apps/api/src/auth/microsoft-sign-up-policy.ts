import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';

const MICROSOFT_PROVIDER_ID = 'microsoft';
const logger = new Logger('MicrosoftSignUpPolicy');

function readField({ source, key }: { source: unknown; key: string }): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return Reflect.get(source, key);
}

export function isMicrosoftSignInContext(context: unknown): boolean {
  const params = readField({ source: context, key: 'params' });
  const body = readField({ source: context, key: 'body' });
  return (
    readField({ source: params, key: 'id' }) === MICROSOFT_PROVIDER_ID ||
    readField({ source: body, key: 'provider' }) === MICROSOFT_PROVIDER_ID
  );
}

export function assertMicrosoftSignUpVerified({
  user,
  context,
}: {
  user: { emailVerified?: unknown };
  context: unknown;
}): void {
  if (!isMicrosoftSignInContext(context)) return;
  if (user.emailVerified === true) return;

  logger.warn(
    'Refused Microsoft sign-up: the ID token has no verified email claim',
  );
  throw new APIError('UNAUTHORIZED', { message: 'account not linked' });
}
