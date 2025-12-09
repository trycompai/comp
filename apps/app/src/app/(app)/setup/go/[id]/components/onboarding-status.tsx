'use client';

import type { onboardOrganization } from '@/trigger/tasks/onboarding/onboard-organization';
import { useRun } from '@trigger.dev/react-hooks';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function OnboardingStatus({ runId }: { runId: string }) {
  const { run, error, isLoading } = useRun<typeof onboardOrganization>(runId, {
    refreshInterval: 1000,
  });

  const router = useRouter();

  useEffect(() => {
    if (run?.status === 'COMPLETED') {
      router.replace('/');
    }
  }, [run?.status, router]);

  return (
    <div className="flex flex-col items-center justify-center">
      {run?.status === 'COMPLETED' && (
        <div className="flex flex-col items-center justify-center">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-muted-foreground text-sm">Redirecting</p>
        </div>
      )}
    </div>
  );
}
