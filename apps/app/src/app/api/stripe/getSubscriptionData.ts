import { db } from '@comp/db';
import { client } from '@comp/kv';
import { STRIPE_SUB_CACHE } from './stripeDataToKv.type';
import { syncStripeDataToKV } from './syncStripeDataToKv';

/**
 * Gets the Stripe customer ID for an organization, checking KV cache first,
 * then falling back to database if needed.
 */
async function getStripeCustomerId(organizationId: string): Promise<string | null> {
  // First, check the KV store for the stripeCustomerId
  let stripeCustomerId = await client.get(`stripe:organization:${organizationId}`);

  // If not present in KV, check the database
  if (!stripeCustomerId) {
    const organization = await db.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!organization?.stripeCustomerId) {
      return null;
    }

    stripeCustomerId = organization.stripeCustomerId;

    // Cache the customer ID in KV for future use
    await client.set(`stripe:organization:${organizationId}`, stripeCustomerId);
  }

  // Ensure we return a string or null, not undefined
  return typeof stripeCustomerId === 'string' ? stripeCustomerId : null;
}

/**
 * Gets subscription data for an organization with automatic fallback to Stripe API
 * if the data is not in KV cache (e.g., due to eviction).
 *
 * This implements a cache-aside pattern:
 * 1. Try to get from cache
 * 2. If cache miss, fetch from source (Stripe)
 * 3. Update cache with fresh data
 * 4. Return the data
 */
export async function getSubscriptionData(organizationId: string): Promise<STRIPE_SUB_CACHE> {
  try {
    // Step 1: Get the Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(organizationId);

    if (!stripeCustomerId) {
      // No Stripe customer associated with this organization
      return { status: 'none' };
    }

    // Step 2: Try to get subscription data from KV cache
    const cachedData = await client.get(`stripe:customer:${stripeCustomerId}`);

    if (cachedData) {
      // Cache hit - return the cached data
      return cachedData as STRIPE_SUB_CACHE;
    }

    // Step 3: Cache miss - fetch from Stripe and update cache
    console.log(`[STRIPE] Cache miss for customer ${stripeCustomerId}, fetching from Stripe API`);

    const freshData = await syncStripeDataToKV(stripeCustomerId);
    return freshData;
  } catch (error) {
    console.error('[STRIPE] Error fetching subscription data:', error);

    // Return a safe default if there's an error
    return { status: 'none' };
  }
}

/**
 * Invalidates the cached subscription data for an organization.
 * Useful when you know the data has changed and want to force a refresh.
 */
export async function invalidateSubscriptionCache(organizationId: string): Promise<void> {
  try {
    const stripeCustomerId = await getStripeCustomerId(organizationId);

    if (stripeCustomerId) {
      await client.del(`stripe:customer:${stripeCustomerId}`);
    }
  } catch (error) {
    console.error('[STRIPE] Error invalidating subscription cache:', error);
  }
}
