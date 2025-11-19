import { Toaster } from '@trycompai/ui/sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <NuqsAdapter>{children}</NuqsAdapter>
      </Suspense>
      <Toaster />
    </>
  );
}
