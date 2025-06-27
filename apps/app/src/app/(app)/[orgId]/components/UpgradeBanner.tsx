'use client';

import { Button } from '@comp/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface UpgradeBannerProps {
  subscriptionType: 'NONE' | 'FREE' | 'STARTER' | 'MANAGED';
  organizationId: string;
}

export function UpgradeBanner({ subscriptionType, organizationId }: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if we should show the banner based on subscription type
  const shouldShowBanner = subscriptionType === 'FREE' || subscriptionType === 'STARTER';

  // Handle dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show if dismissed or not eligible
  if (isDismissed || !shouldShowBanner) {
    return null;
  }

  // Use consistent message for all users who see the banner
  const bannerMessage =
    'Compliance taking too much time? Let us handle it. 14 days to audit-ready.';

  return (
    <div className="relative mb-4 overflow-hidden rounded-lg">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-lg" />

      {/* Animated gradient background layer */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
      </div>

      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Border glow */}
      <div className="absolute inset-0 rounded-lg ring-1 ring-primary/20" />

      {/* Content */}
      <div className="relative px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-foreground/90">{bannerMessage}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/upgrade/${organizationId}`}>
              <Button
                size="sm"
                variant="default"
                className="text-xs bg-primary hover:bg-primary/90"
              >
                Upgrade Now
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
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
