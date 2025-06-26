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
  managedMonthlyPrice: PriceDetails | null;
  managedYearlyPrice: PriceDetails | null;
  starterMonthlyPrice: PriceDetails | null;
  starterYearlyPrice: PriceDetails | null;
  fetchedAt: number;
};

const CACHE_DURATION = 30 * 60; // 30 minutes in seconds

export async function fetchStripePriceDetails(): Promise<CachedPrices> {
  // Fetch from Stripe
  const managedMonthlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_MANAGED_MONTHLY_PRICE_ID;
  const managedYearlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_MANAGED_YEARLY_PRICE_ID;
  const starterMonthlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_MONTHLY_PRICE_ID;
  const starterYearlyPriceId = env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_YEARLY_PRICE_ID;

  // Create a unique cache key that includes the price IDs
  const cacheKey = `stripe:all-prices:${managedMonthlyPriceId || 'none'}:${managedYearlyPriceId || 'none'}:${starterMonthlyPriceId || 'none'}:${starterYearlyPriceId || 'none'}`;

  try {
    // Check cache first
    const cached = await client.get<CachedPrices>(cacheKey);
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CACHE_DURATION * 1000) {
      return cached;
    }
  } catch (error) {
    console.error('[STRIPE] Error reading from cache:', error);
  }

  let managedMonthlyPrice: PriceDetails | null = null;
  let managedYearlyPrice: PriceDetails | null = null;
  let starterMonthlyPrice: PriceDetails | null = null;
  let starterYearlyPrice: PriceDetails | null = null;

  try {
    // Fetch managed monthly price if ID exists
    if (managedMonthlyPriceId) {
      const price = await stripe.prices.retrieve(managedMonthlyPriceId, {
        expand: ['product'],
      });

      managedMonthlyPrice = {
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

    // Fetch managed yearly price if ID exists
    if (managedYearlyPriceId) {
      const price = await stripe.prices.retrieve(managedYearlyPriceId, {
        expand: ['product'],
      });

      managedYearlyPrice = {
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

    // Fetch starter monthly price if ID exists
    if (starterMonthlyPriceId) {
      const price = await stripe.prices.retrieve(starterMonthlyPriceId, {
        expand: ['product'],
      });

      starterMonthlyPrice = {
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

    // Fetch starter yearly price if ID exists
    if (starterYearlyPriceId) {
      const price = await stripe.prices.retrieve(starterYearlyPriceId, {
        expand: ['product'],
      });

      starterYearlyPrice = {
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
    managedMonthlyPrice,
    managedYearlyPrice,
    starterMonthlyPrice,
    starterYearlyPrice,
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
