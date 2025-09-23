import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Toaster } from './components/ui/sonner';
import { ChatProvider } from './lib/chat-context';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <NuqsAdapter>
          <ChatProvider>{children}</ChatProvider>
        </NuqsAdapter>
      </Suspense>
      <Toaster />
    </>
  );
}
