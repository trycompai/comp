import { BadRequestException } from '@nestjs/common';
import type { StripeService } from '../stripe/stripe.service';

export function assertStripeBillingConfigured(
  stripeService: StripeService,
): void {
  if (stripeService.isConfigured()) return;

  throw new BadRequestException('Stripe billing is not configured.');
}
