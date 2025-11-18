'use client';

import * as React from 'react';

export type PolicyTailoringStatus = 'queued' | 'pending' | 'processing' | 'completed';

interface PolicyTailoringContextValue {
  getStatus: (policyId: string) => PolicyTailoringStatus | undefined;
}

const PolicyTailoringContext = React.createContext<PolicyTailoringContextValue>({
  getStatus: () => undefined,
});

interface PolicyTailoringProviderProps {
  statuses: Record<string, PolicyTailoringStatus>;
  children: React.ReactNode;
}

export function PolicyTailoringProvider({
  statuses,
  children,
}: PolicyTailoringProviderProps) {
  const getStatus = React.useCallback(
    (policyId: string) => statuses[policyId],
    [statuses],
  );

  return (
    <PolicyTailoringContext.Provider value={{ getStatus }}>
      {children}
    </PolicyTailoringContext.Provider>
  );
}

export function usePolicyTailoringStatus(policyId: string) {
  const context = React.useContext(PolicyTailoringContext);

  if (!context) {
    throw new Error('usePolicyTailoringStatus must be used within a PolicyTailoringProvider');
  }

  return context.getStatus(policyId);
}

