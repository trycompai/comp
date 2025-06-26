'use client';

import { useSubscription } from '@/context/subscription-context';
import { env } from '@/env.mjs';
import { Button } from '@comp/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function UpgradeBanner() {
  const { subscription, isSelfServe } = useSubscription();
  const params = useParams();
  const orgId = params.orgId as string;
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if we should show the banner
  const shouldShowBanner = () => {
    // Show for FREE plan (self-serve)
    if (isSelfServe) return true;

    // Show for STARTER plan - check if it's a starter subscription via price ID
    if ('priceId' in subscription && subscription.priceId) {
      const starterPriceIds = [
        env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_MONTHLY_PRICE_ID,
        env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_YEARLY_PRICE_ID,
      ].filter(Boolean);

      return starterPriceIds.includes(subscription.priceId);
    }

    return false;
  };

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissedKey = `upgrade-banner-dismissed-${orgId}`;
    const dismissed = localStorage.getItem(dismissedKey);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [orgId]);

  // Handle dismiss
  const handleDismiss = () => {
    const dismissedKey = `upgrade-banner-dismissed-${orgId}`;
    localStorage.setItem(dismissedKey, 'true');
    setIsDismissed(true);
  };

  // Don't show if dismissed or not eligible
  if (isDismissed || !shouldShowBanner()) {
    return null;
  }

  const isFreePlan = isSelfServe;
  const bannerMessage = isFreePlan
    ? 'Unlock advanced features and premium support. Upgrade to a paid plan today!'
    : 'Get white-glove compliance service with our Done For You plan. We handle everything!';

  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{bannerMessage}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/upgrade/${orgId}`}>
              <Button size="sm" variant="secondary" className="text-xs">
                Upgrade Now
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="ml-2 text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}