'use client';

import { Button } from '@trycompai/design-system';
import { Checkmark, Close, Locked } from '@trycompai/design-system/icons';
import { LiveActivityBorder } from './LiveActivityBorder';
import { StepList, type SignInStep } from './StepList';

/** ai = automation drives; 2fa = user enters a code; finish = user completes it. */
export type LiveSigninVariant = 'ai' | '2fa' | 'finish';

interface ConnectLiveSigninProps {
  host: string;
  liveViewUrl: string | null;
  variant: LiveSigninVariant;
  steps: SignInStep[];
  onCancel: () => void;
  /** Confirm button (verify) — shown for the 2fa / finish variants. */
  onConfirm?: () => void;
  isConfirming?: boolean;
  /** Sign-in just succeeded — show a brief confirmation before moving on. */
  success?: boolean;
}

function StatusPill({ variant }: { variant: LiveSigninVariant }) {
  if (variant === 'ai') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
        style={{
          background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
          color: 'var(--primary)',
        }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        AI has control
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{
        background: 'color-mix(in oklab, var(--warning) 22%, transparent)',
        color: 'oklch(0.45 0.13 85)',
      }}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      Your turn
    </span>
  );
}

/**
 * The live sign-in card (design 1b): the embedded cloud browser on the left, and
 * a "Sign-in activity" panel on the right — who's in control, a step timeline of
 * what the AI is doing, and the action the user needs to take (enter a 2FA code,
 * or finish a sign-in the AI can't complete).
 */
export function ConnectLiveSignin({
  host,
  liveViewUrl,
  variant,
  steps,
  onCancel,
  onConfirm,
  isConfirming = false,
  success = false,
}: ConnectLiveSigninProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between border-b border-border px-5 py-3">
        <div>
          <div className="text-base text-foreground">Connect to {host}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Sign in once — Comp saves the session and re-logs in automatically.
          </div>
        </div>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <Close size={12} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left — the live cloud browser */}
        <div className="min-w-0 flex-1 p-4 lg:pr-0">
          <div className="relative overflow-hidden rounded-md border border-border">
            <div className="flex h-[34px] items-center gap-2 border-b border-border bg-muted px-3">
              <Locked size={11} className="text-muted-foreground" />
              <span className="truncate font-mono text-[11.5px] text-foreground">{host}</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--success)' }}
                />
                Cloud browser
              </span>
            </div>
            {liveViewUrl ? (
              <iframe
                src={liveViewUrl}
                title="Live sign-in"
                className="h-[640px] max-h-[80vh] w-full"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
              />
            ) : (
              <div className="flex h-[640px] max-h-[80vh] items-center justify-center text-sm text-muted-foreground">
                <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                Opening {host}…
              </div>
            )}
            {!success && (
              <LiveActivityBorder state={variant === 'ai' ? 'ai' : 'you'} />
            )}
          </div>
        </div>

        {/* Right — sign-in activity */}
        <div className="flex w-full flex-col gap-3 p-4 lg:w-[304px] lg:shrink-0">
          {/* Fixed height matches the browser chrome bar so both headers align. */}
          <div className="flex h-[34px] items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Sign-in activity
            </span>
            <StatusPill variant={variant} />
          </div>

          <StepList steps={steps} />

          {variant === 'ai' && (
            <div className="mt-auto text-[11px] leading-snug text-muted-foreground">
              Take over anytime — click inside the page and the AI pauses.
            </div>
          )}

          {variant === '2fa' && (
            <div
              className="rounded-md p-3"
              style={{
                border: '1px solid color-mix(in oklab, var(--warning) 45%, transparent)',
                background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
              }}
            >
              <div className="mb-1 text-[12.5px] text-foreground">Enter the code in the page</div>
              <div className="mb-2.5 text-[11.5px] leading-normal text-muted-foreground">
                Type the 6-digit code from your authenticator app into the live browser
                (passkeys can’t be used here). Then confirm.
              </div>
              <Button
                onClick={onConfirm}
                loading={isConfirming}
                disabled={!liveViewUrl || isConfirming}
                width="full"
              >
                I&apos;ve entered it — continue
              </Button>
            </div>
          )}

          {variant === 'finish' && (
            <div className="rounded-md border border-border p-3">
              <div className="mb-1 text-[12.5px] text-foreground">Finish sign-in yourself</div>
              <div className="mb-2.5 text-[11.5px] leading-normal text-muted-foreground">
                Complete the sign-in in the live browser — Comp saves the session as
                usual. Then confirm.
              </div>
              <Button
                onClick={onConfirm}
                loading={isConfirming}
                disabled={!liveViewUrl || isConfirming}
                width="full"
              >
                I&apos;ve signed in
              </Button>
            </div>
          )}
        </div>
      </div>

      {success && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-sm animate-in fade-in-0 duration-300"
          style={{ background: 'color-mix(in oklab, var(--background) 82%, transparent)' }}
        >
          <span
            className="grid h-14 w-14 place-items-center rounded-full text-white animate-in zoom-in-50 duration-300"
            style={{ background: 'var(--success)' }}
          >
            <Checkmark size={26} />
          </span>
          <div className="text-center">
            <div className="text-base text-foreground">Signed in</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Saving the session…</div>
          </div>
        </div>
      )}
    </div>
  );
}
