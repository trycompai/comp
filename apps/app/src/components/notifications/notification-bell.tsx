'use client';

import { usePathname } from 'next/navigation';
import { env } from '@/env.mjs';
import { Inbox } from '@novu/nextjs';
import { useSession } from '@/utils/auth-client';
import { Bell, Settings } from 'lucide-react';

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

  const appearance = {
    icons: {
      bell: () => <Bell size={20} />,
      cogs: () => <Settings size={20} />,
    },
    elements: {
      popoverContent: {
        right: '8px',
        left: 'auto !important',
        marginTop: '8px',
        width: '360px',
      },
      notificationDot: {
        backgroundColor: 'hsl(var(--primary))',
      },
      notificationBar: ({ notification }: { notification: any }) => {
        return notification.isRead ? 'bg-transparent' : 'bg-primary';
      }
    }
  };

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriber={`${sessionData.userId}-${orgId}`}
      appearance={appearance}
      renderSubject={(notification) => <strong>{notification.subject}</strong>}
      renderBody={(notification) => (
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">
            {notification.body}
          </p>
        </div>
      )}
    />
  );
}
