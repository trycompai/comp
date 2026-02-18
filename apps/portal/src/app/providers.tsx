'use client';

import { AnalyticsProvider } from '@comp/analytics';
import { Session, User } from 'better-auth';
import type { ReactNode } from 'react';

type ProviderProps = {
  children: ReactNode;
  session: {
    session: Session | null;
    user: User | null;
  } | null;
};

export function Providers({ children, session }: ProviderProps) {
  return (
    <AnalyticsProvider
      userId={session?.user?.id ?? undefined}
      userEmail={session?.user?.email ?? undefined}
    >
      {children}
    </AnalyticsProvider>
  );
}
