import { Toaster } from '@trycompai/ui/toaster';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';

import { headers } from 'next/headers';
import '../styles/globals.css';
import { Header } from './components/HeaderFrameworks';
import { auth } from './lib/auth';
import { isInternalUser } from './lib/utils';

export const metadata: Metadata = {
  title: 'Comp AI - Framework Editor',
  description: 'Edit your framework',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const hasSession =
    !!session?.user &&
    session.user.role === 'admin' &&
    isInternalUser(session.user.email);

  return (
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col">
        {hasSession && <Header />}
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
