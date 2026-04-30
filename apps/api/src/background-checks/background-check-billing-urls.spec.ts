import { BadRequestException } from '@nestjs/common';
import { validateBackgroundCheckBillingRedirectUrl } from './background-check-billing-urls';

describe('validateBackgroundCheckBillingRedirectUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws a controlled error when the configured app URL is malformed', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not a url';
    process.env.APP_URL = '';
    process.env.BETTER_AUTH_URL = '';

    expect(() =>
      validateBackgroundCheckBillingRedirectUrl(
        'https://app.trycomp.ai/return',
      ),
    ).toThrow(BadRequestException);
  });
});
