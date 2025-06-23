import { db } from '@comp/db';
import { STRIPE_SUB_CACHE } from './stripeDataToKv.type';

/**
 * Gets subscription data for an organization from the database.
 * This is now a simple database lookup with no KV caching.
 */
export async function getSubscriptionData(organizationId: string): Promise<STRIPE_SUB_CACHE> {
  try {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionType: true,
        stripeSubscriptionData: true,
      },
    });

    if (!organization) {
      console.log(`[SUBSCRIPTION] Organization ${organizationId} not found`);
      return { status: 'none' };
    }

    // Return based on subscription type
    switch (organization.subscriptionType) {
      case 'SELF_SERVE':
        console.log(`[SUBSCRIPTION] Org ${organizationId} is on self-serve plan`);
        return { status: 'self-serve' };

      case 'STRIPE':
        if (organization.stripeSubscriptionData) {
          const data = organization.stripeSubscriptionData as STRIPE_SUB_CACHE;
          console.log(
            `[SUBSCRIPTION] Org ${organizationId} has Stripe subscription with status: ${data.status}`,
          );
          return data;
        }
        console.log(`[SUBSCRIPTION] Org ${organizationId} has STRIPE type but no data`);
        return { status: 'none' };

      case 'NONE':
      default:
        console.log(`[SUBSCRIPTION] Org ${organizationId} has no subscription`);
        return { status: 'none' };
    }
  } catch (error) {
    console.error('[SUBSCRIPTION] Error fetching subscription data:', error);
    return { status: 'none' };
  }
}

/**
 * Invalidates the cached subscription data for an organization.
 * With the DB approach, this is now a no-op but kept for compatibility.
 */
export async function invalidateSubscriptionCache(organizationId: string): Promise<void> {
  // No-op - data is always fresh from DB
  console.log(
    `[SUBSCRIPTION] Cache invalidation requested for ${organizationId} (no-op with DB approach)`,
  );
}
