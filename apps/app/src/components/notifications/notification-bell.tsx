'use client';

import { usePathname } from 'next/navigation';
import { env } from '@/env.mjs';
import { Inbox } from '@novu/nextjs';
import { useSession } from '@/utils/auth-client';
import { Bell, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function NotificationBell() {
  const applicationIdentifier = env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
  const { data: session } = useSession();
  const sessionData = session?.session;
  const pathname = usePathname();
  const orgId = pathname?.split('/')[1] || null;
  const [visible, setVisible] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close inbox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);
  
  // Don't render if we don't have the required config
  if (!applicationIdentifier || !sessionData?.userId || !orgId) {
    return null;
  }

  const appearance = {
    icons: {
      cogs: () => <Settings size={20} />,
    },
    elements: {
      popoverContent: {
        right: '8px',
        left: 'auto !important',
        marginTop: '8px',
        width: '360px',
        borderRadius: '8px',
      },
      notification: {
        paddingLeft: '24px',
      },
      notificationDot: {
        backgroundColor: 'hsl(var(--primary))',
      },
      notificationImage: {
        display: 'none',
      },
      notificationBar: ({ notification }: { notification: any }) => {
        return notification.isRead ? 'bg-transparent' : 'bg-primary';
      }
    }
  };

  return (
    <div ref={inboxRef}>
      <Inbox
        applicationIdentifier={applicationIdentifier}
        subscriber={`${sessionData.userId}-${orgId}`}
        appearance={appearance}
        open={visible}
        renderBell={({ total }) => (
          <button
            onClick={() => setVisible(!visible)}
            className="relative cursor-pointer"
          >
            <Bell size={20} />
            {total > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        )}
        renderSubject={(notification) => <strong>{notification.subject}</strong>}
        renderBody={(notification) => (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground">
              {notification.body}
            </p>
          </div>
        )}
        onNotificationClick={() => setVisible(false)}
      />
    </div>
  );
}
