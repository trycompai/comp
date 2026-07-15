'use client';

import { Button } from '@trycompai/design-system';

interface ConnectLiveSigninProps {
  host: string;
  liveViewUrl: string | null;
  isChecking: boolean;
  onCheck: () => void;
  onCancel: () => void;
}

/**
 * The live-browser sign-in view: the user completes the vendor login themselves
 * in an embedded Browserbase session. Used for SSO / passkey and as the fallback
 * when the automated password sign-in can't finish on its own.
 */
export function ConnectLiveSignin({
  host,
  liveViewUrl,
  isChecking,
  onCheck,
  onCancel,
}: ConnectLiveSigninProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      {liveViewUrl ? (
        <div className="overflow-hidden rounded-md border border-border">
          <iframe
            src={liveViewUrl}
            title="Live sign-in"
            className="h-[420px] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
          <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          Opening {host}…
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Sign in above, then confirm — encrypted, we record only what the automation needs.
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onCheck}
            loading={isChecking}
            disabled={!liveViewUrl || isChecking}
          >
            I&apos;ve signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
