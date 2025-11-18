'use client';

import { createContext, useContext } from 'react';
import type { OnboardingItemStatus } from '../../../risk/(overview)/hooks/use-onboarding-status';

export type VendorOnboardingStatus = Record<string, OnboardingItemStatus>;

interface VendorOnboardingContextValue {
  statuses: VendorOnboardingStatus;
}

const VendorOnboardingContext = createContext<VendorOnboardingContextValue | undefined>(undefined);

export function VendorOnboardingProvider({
  children,
  statuses,
}: {
  children: React.ReactNode;
  statuses: VendorOnboardingStatus;
}) {
  return (
    <VendorOnboardingContext.Provider value={{ statuses }}>
      {children}
    </VendorOnboardingContext.Provider>
  );
}

export function useVendorOnboardingStatus() {
  const context = useContext(VendorOnboardingContext);
  if (!context) {
    return {};
  }
  return context.statuses;
}

