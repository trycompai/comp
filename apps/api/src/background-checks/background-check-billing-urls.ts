import { BadRequestException } from '@nestjs/common';

export function validateBackgroundCheckBillingRedirectUrl(url: string): void {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL;
  if (!appUrl) {
    throw new BadRequestException('App URL is not configured on the server.');
  }

  let appOrigin: string;
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
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

  if (parsed.origin !== appOrigin) {
    throw new BadRequestException(
      'Redirect URL must belong to the application origin.',
    );
  }
}
