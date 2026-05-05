import { BadRequestException } from '@nestjs/common';

export function validateBackgroundCheckBillingRedirectUrl(url: string): void {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL;
  if (!appUrl) {
    throw new BadRequestException('App URL is not configured on the server.');
  }

  let appUrlParsed: URL;
  try {
    appUrlParsed = new URL(appUrl);
  } catch {
    throw new BadRequestException(
      'App URL is not configured correctly on the server.',
    );
  }
  if (!isWebUrl(appUrlParsed)) {
    throw new BadRequestException(
      'App URL is not configured correctly on the server.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Invalid redirect URL.');
  }
  if (!isWebUrl(parsed)) {
    throw new BadRequestException('Invalid redirect URL.');
  }

  if (parsed.origin !== appUrlParsed.origin) {
    throw new BadRequestException(
      'Redirect URL must belong to the application origin.',
    );
  }
}

function isWebUrl(url: URL): boolean {
  return (
    url.origin !== 'null' &&
    (url.protocol === 'https:' || url.protocol === 'http:')
  );
}
