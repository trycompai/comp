'use client';

import { createContext, useContext, useState } from 'react';
import { UpdatePoliciesDialog } from './update-policies-dialog';

interface PolicyUpdateContextValue {
  triggerPolicyUpdate: (context: { id: string; question: string }) => void;
}

const PolicyUpdateContext = createContext<PolicyUpdateContextValue | null>(null);

export function PolicyUpdateProvider({ children }: { children: React.ReactNode }) {
  const [pendingContext, setPendingContext] = useState<{ id: string; question: string } | null>(
    null,
  );

  const triggerPolicyUpdate = (context: { id: string; question: string }) => {
    setPendingContext(context);
  };

  return (
    <PolicyUpdateContext.Provider value={{ triggerPolicyUpdate }}>
      {children}
      <UpdatePoliciesDialog context={pendingContext} onClose={() => setPendingContext(null)} />
    </PolicyUpdateContext.Provider>
  );
}

export function usePolicyUpdate() {
  const context = useContext(PolicyUpdateContext);
  if (!context) {
    throw new Error('usePolicyUpdate must be used within a PolicyUpdateProvider');
  }
  return context;
}
