import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { CommandLogsStream } from './components/commands-logs/commands-logs-stream';
import { ErrorMonitor } from './components/error-monitor/error-monitor';
import { SandboxState } from './components/modals/sandbox-state';
import { Toaster } from './components/ui/sonner';
import { ChatProvider } from './lib/chat-context';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <NuqsAdapter>
          <ChatProvider>
            <ErrorMonitor>{children}</ErrorMonitor>
          </ChatProvider>
        </NuqsAdapter>
      </Suspense>
      <Toaster />
      <CommandLogsStream />
      <SandboxState />
    </>
  );
}
