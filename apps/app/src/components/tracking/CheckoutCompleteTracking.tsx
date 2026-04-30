'use client';

import { trackEvent, trackPurchaseEvent } from '@/utils/tracking';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function CheckoutCompleteTracking() {
  const searchParams = useSearchParams();
  const checkoutComplete = searchParams.get('checkoutComplete');
  const organizationId = searchParams.get('organizationId');
  const value = searchParams.get('value');

  useEffect(() => {
    if (checkoutComplete) {
      // Parse value if provided
      const transactionValue = value ? parseFloat(value) : undefined;

      // Product analytics only. Paid-media revenue/signed-deal measurement lives in HubSpot imports.
      trackPurchaseEvent('purchase_completed', transactionValue);

      // Track specific plan type with enhanced product analytics data
      trackEvent('purchase_completed', {
        event_category: 'ecommerce',
        plan_type: checkoutComplete,
        event_label: `${checkoutComplete}_purchase_completed`,
        value: transactionValue,
        currency: 'USD',
        transaction_id: `${organizationId}_${Date.now()}`, // Unique transaction ID
        items: [
          {
            item_name: checkoutComplete === 'starter' ? 'Starter Plan' : 'Done For You Plan',
            item_category: 'subscription',
            item_variant: checkoutComplete,
            price: transactionValue,
            quantity: 1,
          },
        ],
      });
    }
  }, [checkoutComplete, organizationId, value]);

  return null;
}
