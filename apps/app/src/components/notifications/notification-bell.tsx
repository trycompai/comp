'use client';

import { usePathname } from 'next/navigation';
import { env } from '@/env.mjs';
import { Inbox } from '@novu/nextjs';
import { useSession } from '@/utils/auth-client';

export function NotificationBell() {
  const applicationIdentifier = env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
  const { data: session } = useSession();
  const sessionData = session?.session;
  const pathname = usePathname();
  const orgId = pathname?.split('/')[1] || null;
  
  // Don't render if we don't have the required config
  if (!applicationIdentifier || !sessionData?.userId || !orgId) {
    return null;
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriber={`${sessionData.userId}-${orgId}`}
      appearance={{
        elements: {
          popoverContent: {
            right: '8px',
            left: 'auto !important',
            marginTop: '8px',
            width: '360px',
          },
        },
      }}
    />
  );
}
