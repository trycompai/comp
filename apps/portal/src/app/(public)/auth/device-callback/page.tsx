'use client';

import { Icons } from '@comp/ui/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Status = 'redirecting' | 'success' | 'error';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function DeviceCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('redirecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const callbackPort = searchParams.get('callback_port');
    const state = searchParams.get('state');

    if (!callbackPort || !state) {
      setStatus('error');
      setErrorMessage('Missing required parameters. Please try signing in again from the Comp AI agent.');
      return;
    }

    const port = Number.parseInt(callbackPort, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      setStatus('error');
      setErrorMessage('Invalid callback port. Please try signing in again from the Comp AI agent.');
      return;
    }

    async function exchangeAndRedirect() {
      try {
        // Generate an auth code by calling the NestJS API cross-origin
        const response = await fetch(`${apiUrl}/v1/device-agent/auth-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ callback_port: port, state }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || data.message || `Server returned ${response.status}`);
        }

        const { code } = await response.json();

        // Redirect to the device agent's localhost server
        window.location.href = `http://localhost:${port}/auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state!)}`;

        setStatus('success');
      } catch (err) {
        console.error('Device auth callback failed:', err);
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to complete sign-in. Please try again from the Comp AI agent.',
        );
      }
    }

    exchangeAndRedirect();
  }, [searchParams]);

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3 pt-10">
            <Icons.Logo className="h-10 w-10 mx-auto" />
            <CardTitle className="text-xl tracking-tight text-card-foreground">
              {status === 'redirecting' && 'Completing sign-in...'}
              {status === 'success' && 'Sign-in complete!'}
              {status === 'error' && 'Sign-in failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-10">
            {status === 'redirecting' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Redirecting to the Comp AI agent...
                </p>
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  You can close this tab and return to the Comp AI agent.
                </p>
              </div>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
