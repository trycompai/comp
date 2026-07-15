'use client';

import { Button } from '@trycompai/design-system';

interface ConnectLiveSigninProps {
  host: string;
  liveViewUrl: string | null;
  /** Helper line under the browser. */
  caption: string;
  onCancel: () => void;
  /** When set, show a confirm button (e.g. "I've signed in") that runs this. */
  onConfirm?: () => void;
  confirmLabel?: string;
  isConfirming?: boolean;
  /** The automation is currently driving the browser — show a working badge. */
  working?: boolean;
}

/**
 * The live-browser view. Used three ways:
 * - watching the automated sign-in drive the browser (`working`),
 * - taking over when it couldn't finish (`onConfirm` + `confirmLabel`),
 * - a fully manual sign-in for SSO / passkey.
 */
export function ConnectLiveSignin({
  host,
  liveViewUrl,
  caption,
  onCancel,
  onConfirm,
  confirmLabel = "I've signed in",
  isConfirming = false,
  working = false,
}: ConnectLiveSigninProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      {liveViewUrl ? (
        <div className="overflow-hidden rounded-md border border-border">
          <iframe
            src={liveViewUrl}
            title="Live sign-in"
            className="h-[600px] max-h-[75vh] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <div className="flex h-[600px] max-h-[75vh] items-center justify-center text-sm text-muted-foreground">
          <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          Opening {host}…
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {working && (
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
          )}
          {caption}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {onConfirm && (
            <Button
              onClick={onConfirm}
              loading={isConfirming}
              disabled={!liveViewUrl || isConfirming}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
