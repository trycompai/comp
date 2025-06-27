'use client';

import { env } from '@/env.mjs';
import { trackEvent, trackLinkedInConversion, trackPurchaseEvent } from '@/utils/tracking';
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

      // Track purchase completion with value
      trackPurchaseEvent('purchase_completed', transactionValue);

      // Track specific plan type with enhanced data for Google Ads
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

      // Send Google Ads specific conversion event if conversion label is configured
      if (env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL) {
        trackEvent('conversion', {
          send_to: env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
          value: transactionValue,
          currency: 'USD',
          transaction_id: `${organizationId}_${Date.now()}`,
        });
      }

      // Track LinkedIn conversion if ID is available
      if (env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID) {
        trackLinkedInConversion(env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID);
      }
    }
  }, [checkoutComplete, organizationId, value]);

  return null;
}
