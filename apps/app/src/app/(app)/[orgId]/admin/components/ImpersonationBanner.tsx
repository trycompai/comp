'use client';

import { authClient, useSession } from '@/utils/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [stopping, setStopping] = useState(false);

  const rawImpersonatedBy = (
    session?.session as Record<string, unknown> | undefined
  )?.impersonatedBy;
  const impersonatedBy =
    typeof rawImpersonatedBy === 'string' ? rawImpersonatedBy : undefined;

  if (!impersonatedBy) return null;

  const orgId = pathname?.split('/')[1] ?? '';

  const handleStop = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      (authClient.$store as { notify: (signal: string) => void }).notify(
        '$sessionSignal',
      );
      router.push(`/${orgId}/admin/organizations`);
      router.refresh();
    } catch {
      setStopping(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
      <span>
        Impersonating <span className="font-medium">{session?.user?.name ?? 'a user'}</span>{' '}
        ({session?.user?.email})
      </span>
      <button
        onClick={handleStop}
        disabled={stopping}
        className="rounded-md border border-destructive/30 px-2.5 py-1 font-medium transition-colors hover:bg-destructive/10 disabled:opacity-50"
      >
        {stopping ? 'Stopping...' : 'Stop Impersonating'}
      </button>
    </div>
  );
}
