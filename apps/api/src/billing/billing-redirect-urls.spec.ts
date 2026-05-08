import { BadRequestException } from '@nestjs/common';
import { validateBillingRedirectUrl } from './billing-redirect-urls';

describe('validateBillingRedirectUrl', () => {
  it('allows http only for local development hosts', () => {
    expect(() =>
      validateBillingRedirectUrl('http://localhost:3000/org_1/billing'),
    ).not.toThrow();

    expect(() =>
      validateBillingRedirectUrl('http://app.trycomp.ai/org_1/billing'),
    ).toThrow(BadRequestException);
  });
});
