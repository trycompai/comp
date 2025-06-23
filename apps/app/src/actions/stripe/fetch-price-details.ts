'use server';

import { stripe } from '@/actions/organization/lib/stripe';
import { env } from '@/env.mjs';
import { client } from '@comp/kv';
import Stripe from 'stripe';

type PriceDetails = {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: Stripe.Price.Recurring.Interval | null;
  productName: string | null;
};

export type CachedPrices = {
  monthlyPrice: PriceDetails | null;
  yearlyPrice: PriceDetails | null;
  fetchedAt: number;
};

const CACHE_DURATION = 30 * 60; // 30 minutes in seconds

export async function fetchStripePriceDetails(): Promise<CachedPrices> {
  // Fetch from Stripe
  const monthlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_MANAGED_MONTHLY_PRICE_ID;
  const yearlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_MANAGED_YEARLY_PRICE_ID;

  // Create a unique cache key that includes the price IDs
  const cacheKey = `stripe:managed-prices:${monthlyPriceId || 'none'}:${yearlyPriceId || 'none'}`;

  try {
    // Check cache first
    const cached = await client.get<CachedPrices>(cacheKey);
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CACHE_DURATION * 1000) {
      return cached;
    }
  } catch (error) {
    console.error('[STRIPE] Error reading from cache:', error);
  }

  let monthlyPrice: PriceDetails | null = null;
  let yearlyPrice: PriceDetails | null = null;

  try {
    // Fetch monthly price if ID exists
    if (monthlyPriceId) {
      const price = await stripe.prices.retrieve(monthlyPriceId, {
        expand: ['product'],
      });

      monthlyPrice = {
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        productName:
          price.product && typeof price.product === 'object' && !price.product.deleted
            ? price.product.name
            : null,
      };
    }

    // Fetch yearly price if ID exists
    if (yearlyPriceId) {
      const price = await stripe.prices.retrieve(yearlyPriceId, {
        expand: ['product'],
      });

      yearlyPrice = {
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        productName:
          price.product && typeof price.product === 'object' && !price.product.deleted
            ? price.product.name
            : null,
      };
    }
  } catch (error) {
    console.error('[STRIPE] Error fetching prices:', error);
  }

  const priceData: CachedPrices = {
    monthlyPrice,
    yearlyPrice,
    fetchedAt: Date.now(),
  };

  // Cache the results
  try {
    await client.set(cacheKey, priceData, {
      ex: CACHE_DURATION,
    });
  } catch (error) {
    console.error('[STRIPE] Error caching price data:', error);
  }

  return priceData;
}
