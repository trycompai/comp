'use client';

import { Button } from '@comp/ui/button';
import { generateCheckoutSessionAction } from '@/app/api/stripe/generate-checkout-session/generate-checkout-session';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { env } from '@/env.mjs';

export function CheckoutForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  const { execute, result, status, isExecuting } = useAction(generateCheckoutSessionAction, {
    onSuccess: ({ data }) => {
      if (data?.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
    },
    onError: ({ error }) => {
      // Optional: Log errors to monitoring service
      console.error('Checkout session error:', error);
    },
  });

  // Construct the base URL for success and cancel URLs
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3000';

  return (
    <div className="space-y-4">
      {/* Show validation errors */}
      {result.validationErrors && (
        <div className="rounded-xs border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          <p className="font-medium">Validation Error</p>
          <pre className="mt-1 text-xs">{JSON.stringify(result.validationErrors, null, 2)}</pre>
        </div>
      )}

      {/* Show server errors */}
      {result.serverError && (
        <div className="rounded-xs border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          {result.serverError}
        </div>
      )}

      <Button
        onClick={() =>
          execute({
            organizationId,
            mode: 'subscription',
            successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/billing`,
            allowPromotionCodes: true,
            priceId: env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID,
          })
        }
        disabled={isExecuting}
      >
        {isExecuting ? 'Creating session...' : 'Create Checkout Session'}
      </Button>

      {/* Optional: Show status for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <p className="text-muted-foreground text-xs">Status: {status}</p>
      )}
    </div>
  );
}
