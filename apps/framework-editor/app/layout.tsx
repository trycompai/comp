import { Toaster } from '@trycompai/ui/toaster';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';

import { headers } from 'next/headers';
import '../styles/globals.css';
import { Header } from './components/HeaderFrameworks';
import { auth } from './lib/auth';

export const metadata: Metadata = {
  title: 'Comp AI - Framework Editor',
  description: 'Edit your framework',
};

const ALLOWED_DOMAIN = 'trycomp.ai';

function isInternalUser(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[1] === ALLOWED_DOMAIN;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const hasSession =
    !!session?.session?.id && !!session?.user?.email && isInternalUser(session.user.email);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        {hasSession && <Header />}
        <div className="flex h-full w-screen flex-col gap-2 p-4">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
