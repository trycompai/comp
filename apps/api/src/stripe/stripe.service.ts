import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { isPublicEmailDomain } from './domain.utils';

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

  /**
   * Look up a Stripe customer by company domain. Prefers an exact match against
   * the customer's `domain` metadata, then falls back to scanning customers
   * whose primary email belongs to that domain. Public mailbox domains
   * (gmail.com, etc.) are never matched — domain ownership of those does not
   * imply company affiliation.
   */
  async findCustomerByDomain(
    domain: string,
  ): Promise<{ customerId: string; customerName: string | null } | null> {
    if (!this.client || !domain) {
      return null;
    }

    const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');
    if (isPublicEmailDomain(normalizedDomain)) {
      return null;
    }

    try {
      const byMetadata = await this.client.customers.search({
        query: `metadata["domain"]:"${normalizedDomain}"`,
        limit: 1,
      });

      if (byMetadata.data.length > 0) {
        const customer = byMetadata.data[0];
        return {
          customerId: customer.id,
          customerName: customer.name ?? null,
        };
      }

      // `email~` is substring matching — re-filter for exact email-domain match.
      const byEmail = await this.client.customers.search({
        query: `email~"@${normalizedDomain}"`,
        limit: 25,
      });

      const exactMatch = byEmail.data.find((customer) => {
        const email = customer.email ?? '';
        const emailDomain = email.split('@')[1]?.toLowerCase().trim() ?? '';
        return emailDomain === normalizedDomain;
      });

      if (exactMatch) {
        return {
          customerId: exactMatch.id,
          customerName: exactMatch.name ?? null,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error searching Stripe customers by domain "${normalizedDomain}"`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * Returns true when the given domain belongs to a Stripe customer with at
   * least one active subscription. Used for domain-based auto-approval of
   * organization access.
   */
  async isDomainActiveCustomer(domain: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');
    if (!normalizedDomain || isPublicEmailDomain(normalizedDomain)) {
      return false;
    }

    const customer = await this.findCustomerByDomain(normalizedDomain);
    if (!customer) {
      return false;
    }

    try {
      const subscriptions = await this.client.subscriptions.list({
        customer: customer.customerId,
        status: 'active',
        limit: 1,
      });
      return subscriptions.data.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking active subscriptions for customer "${customer.customerId}"`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
