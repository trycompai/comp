'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useSandboxStore } from '../../state';

export function SandboxState() {
  const { sandboxId, status, setStatus } = useSandboxStore();
  // Remove modal for max duration; keep silent state management.

  return sandboxId ? <DirtyChecker sandboxId={sandboxId} setStatus={setStatus} /> : null;
}

interface DirtyCheckerProps {
  sandboxId: string;
  setStatus: (status: 'running' | 'stopped') => void;
}

function DirtyChecker({ sandboxId, setStatus }: DirtyCheckerProps) {
  const content = useSWR<'ok' | 'stopped'>(
    `/api/tasks-automations/sandboxes/${sandboxId}`,
    async (pathname: string, init: RequestInit) => {
      const response = await fetch(pathname, init);
      const { status } = await response.json();
      return status;
    },
    { refreshInterval: 1000 },
  );

  useEffect(() => {
    // Treat any 'stopped' status as transient; immediately set to 'running'
    if (content.data === 'stopped') setStatus('running');
  }, [setStatus, content.data]);

  return null;
}
