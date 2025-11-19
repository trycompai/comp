'use client';

import * as React from 'react';

export type RiskOnboardingStatus = 'pending' | 'processing' | 'created' | 'assessing' | 'completed';

interface RiskOnboardingContextValue {
  getStatus: (riskId: string) => RiskOnboardingStatus | undefined;
}

const RiskOnboardingContext = React.createContext<RiskOnboardingContextValue>({
  getStatus: () => undefined,
});

interface RiskOnboardingProviderProps {
  statuses: Record<string, RiskOnboardingStatus>;
  children: React.ReactNode;
}

export function RiskOnboardingProvider({
  statuses,
  children,
}: RiskOnboardingProviderProps) {
  const getStatus = React.useCallback(
    (riskId: string) => statuses[riskId],
    [statuses],
  );

  return (
    <RiskOnboardingContext.Provider value={{ getStatus }}>
      {children}
    </RiskOnboardingContext.Provider>
  );
}

export function useRiskOnboardingStatus(riskId: string) {
  const context = React.useContext(RiskOnboardingContext);

  if (!context) {
    throw new Error('useRiskOnboardingStatus must be used within a RiskOnboardingProvider');
  }

  return context.getStatus(riskId);
}

