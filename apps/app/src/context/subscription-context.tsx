'use client';

import { STRIPE_SUB_CACHE } from '@/app/api/stripe/stripeDataToKv.type';
import { createContext, useContext } from 'react';

interface SubscriptionContextValue {
  subscription: STRIPE_SUB_CACHE;
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  isSelfServe: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({
  children,
  subscription,
}: {
  children: React.ReactNode;
  subscription: STRIPE_SUB_CACHE;
}) {
  const hasActiveSubscription =
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'self-serve';

  const isTrialing = subscription.status === 'trialing';
  const isSelfServe = subscription.status === 'self-serve';

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        hasActiveSubscription,
        isTrialing,
        isSelfServe,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
