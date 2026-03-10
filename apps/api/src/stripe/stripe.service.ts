import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.client = new Stripe(secretKey, {
        apiVersion: '2026-02-25.clover',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe billing disabled');
      this.client = null;
    }
  }

  getClient(): Stripe {
    if (!this.client) {
      throw new Error('Stripe is not configured.');
    }
    return this.client;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}
