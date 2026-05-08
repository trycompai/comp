import { HttpException, HttpStatus } from '@nestjs/common';
import type { StripeService } from '../stripe/stripe.service';

export function assertStripeBillingConfigured(
  stripeService: StripeService,
): void {
  if (stripeService.isConfigured()) return;

  throw new HttpException(
    'Stripe billing is not configured.',
    HttpStatus.PAYMENT_REQUIRED,
  );
}
