'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import { usePolicyUpdateRealtime } from '../hooks/use-policy-update-realtime';
import { PolicyUpdateSheet } from './policy-update-sheet';
import { UpdatePoliciesDialog } from './update-policies-dialog';

interface PolicyUpdateContextValue {
  triggerPolicyUpdate: (context: { id: string; question: string }) => void;
  openSheet: () => void;
}

interface RunInfo {
  runId: string;
  accessToken: string;
}

const PolicyUpdateContext = createContext<PolicyUpdateContextValue | null>(null);

export function PolicyUpdateProvider({ children }: { children: React.ReactNode }) {
  const [pendingContext, setPendingContext] = useState<{ id: string; question: string } | null>(
    null,
  );
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const status = usePolicyUpdateRealtime({
    runId: runInfo?.runId ?? null,
    accessToken: runInfo?.accessToken ?? null,
    enabled: !!runInfo,
  });

  const triggerPolicyUpdate = useCallback((context: { id: string; question: string }) => {
    setPendingContext(context);
  }, []);

  const handleRunStarted = useCallback((runId: string, accessToken: string) => {
    setRunInfo({ runId, accessToken });
  }, []);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setPendingContext(null);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open && status.isComplete) {
      setRunInfo(null);
    }
  }, [status.isComplete]);

  return (
    <PolicyUpdateContext.Provider value={{ triggerPolicyUpdate, openSheet }}>
      {children}
      <UpdatePoliciesDialog
        context={pendingContext}
        onClose={handleCloseDialog}
        onRunStarted={handleRunStarted}
        status={runInfo ? status : null}
        onOpenSheet={openSheet}
      />
      <PolicyUpdateSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} status={status} />
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
