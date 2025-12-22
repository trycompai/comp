import { env } from '@/env.mjs';
import Stripe from 'stripe';

// Initialize Stripe client with secret key from environment
const stripeSecretKey = env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe auto-approval will be disabled');
}

// Domains that should NEVER be used for domain-based auto-approval.
// These are shared/public mailbox providers where domain ownership does not imply company affiliation.
const PUBLIC_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  // Yahoo
  'yahoo.com',
  'ymail.com',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // Proton
  'proton.me',
  'protonmail.com',
  'pm.me',
  // AOL
  'aol.com',
]);

export const isPublicEmailDomain = (domain: string): boolean => {
  const normalized = domain.toLowerCase().trim().replace(/\.$/, '');
  return PUBLIC_EMAIL_DOMAINS.has(normalized);
};

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    })
  : null;

/**
 * Extract domain from a website URL or email
 * @param input - URL (e.g., "https://example.com") or email (e.g., "user@example.com")
 * @returns Normalized domain (e.g., "example.com")
 */
export const extractDomain = (input: string): string | null => {
  if (!input) return null;

  try {
    // If it looks like an email, extract domain from after @
    if (input.includes('@') && !input.includes('://')) {
      const domain = input.split('@')[1]?.toLowerCase().trim();
      return domain || null;
    }

    // Otherwise, treat as URL
    let url = input.trim().toLowerCase();

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/**
 * Check if a domain belongs to an existing Stripe customer
 * Searches by customer email domain and metadata
 *
 * @param domain - The domain to check (e.g., "acme.com")
 * @returns Customer ID if found, null otherwise
 */
export const findStripeCustomerByDomain = async (
  domain: string,
): Promise<{ customerId: string; customerName: string | null } | null> => {
  if (!stripe) {
    console.warn('Stripe client not initialized - skipping customer lookup');
    return null;
  }

  if (!domain) {
    return null;
  }

  const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');

  // Defense-in-depth: never treat public mailbox domains as proof of company ownership.
  if (isPublicEmailDomain(normalizedDomain)) {
    return null;
  }

  try {
    // Prefer exact domain match via metadata when available.
    const customersWithMetadata = await stripe.customers.search({
      query: `metadata["domain"]:"${normalizedDomain}"`,
      limit: 1,
    });

    if (customersWithMetadata.data.length > 0) {
      const customer = customersWithMetadata.data[0];
      return {
        customerId: customer.id,
        customerName: customer.name ?? null,
      };
    }

    // Fallback: Stripe's email~ operator is substring matching; post-filter for exact email domain.
    const customers = await stripe.customers.search({
      query: `email~"@${normalizedDomain}"`,
      limit: 25,
    });

    const exactDomainCustomer = customers.data.find((customer) => {
      const email = customer.email ?? '';
      const emailDomain = email.split('@')[1]?.toLowerCase().trim() ?? '';
      return emailDomain === normalizedDomain;
    });

    if (exactDomainCustomer) {
      return {
        customerId: exactDomainCustomer.id,
        customerName: exactDomainCustomer.name ?? null,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching Stripe customers:', error);
    return null;
  }
};

/**
 * Check if a domain is an active Stripe customer with a valid subscription
 *
 * @param domain - The domain to check
 * @returns true if domain has an active subscription
 */
export const isDomainActiveStripeCustomer = async (domain: string): Promise<boolean> => {
  const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');

  if (!normalizedDomain) {
    return false;
  }

  // Never auto-approve based on public email domains.
  if (isPublicEmailDomain(normalizedDomain)) {
    return false;
  }

  const customer = await findStripeCustomerByDomain(normalizedDomain);

  if (!customer) {
    return false;
  }

  if (!stripe) {
    return false;
  }

  try {
    // Check if customer has an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.customerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data.length > 0;
  } catch (error) {
    console.error('Error checking Stripe subscriptions:', error);
    return false;
  }
};
