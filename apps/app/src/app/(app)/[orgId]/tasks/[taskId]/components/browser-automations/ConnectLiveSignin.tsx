'use client';

import { Button } from '@trycompai/design-system';

interface ConnectLiveSigninProps {
  host: string;
  liveViewUrl: string | null;
  /** Helper line shown in the control banner. */
  caption: string;
  onCancel: () => void;
  /** When set, show a confirm button (e.g. "I've signed in") that runs this. */
  onConfirm?: () => void;
  confirmLabel?: string;
  isConfirming?: boolean;
  /** The automation is currently driving the browser — show the AI-control banner. */
  working?: boolean;
  /** Live narration of what the AI is doing right now (shown while `working`). */
  statusLine?: string;
}

/**
 * The live-browser view with a clear "who's in control" banner:
 * - `working` → the AI is driving (blue banner, "sit tight");
 * - otherwise → the user's turn (amber banner + the instruction), used for the
 *   take-over and for a fully manual SSO / passkey sign-in.
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
  statusLine,
}: ConnectLiveSigninProps) {
  const frameClass = working
    ? 'border-primary'
    : onConfirm
      ? 'border-amber-500'
      : 'border-border';
  const bannerClass = working
    ? 'bg-primary/10 text-primary'
    : onConfirm
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-muted text-muted-foreground';

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={`overflow-hidden rounded-md border-2 ${frameClass}`}>
        <div className={`flex items-start gap-2 px-3 py-2 text-xs font-medium ${bannerClass}`}>
          {working ? (
            <>
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="flex flex-col gap-0.5">
                <span>AI is signing you in — sit tight, no need to touch the browser.</span>
                {statusLine && <span className="font-normal opacity-80">{statusLine}</span>}
              </span>
            </>
          ) : (
            <>
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-current" />
              <span>Your turn — {caption}</span>
            </>
          )}
        </div>
        {liveViewUrl ? (
          <iframe
            src={liveViewUrl}
            title="Live sign-in"
            className="h-[600px] max-h-[75vh] w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex h-[600px] max-h-[75vh] items-center justify-center text-sm text-muted-foreground">
            <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            Opening {host}…
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
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
  );
}
