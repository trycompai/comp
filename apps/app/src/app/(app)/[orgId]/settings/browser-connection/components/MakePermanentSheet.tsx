'use client';

import {
  Button,
  Input,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@trycompai/design-system';
import { Checkmark, Close, Locked, View, ViewOff } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { MfaSetupHelp } from '../../../tasks/[taskId]/components/browser-automations/MfaSetupHelp';

/** The minimum the sheet needs — so both the settings list (Connection) and the
 *  task flow (BrowserAuthProfile) can reuse it without coupling their types. */
export interface MakePermanentConnection {
  id: string;
  hostname: string;
  displayName: string;
}

interface MakePermanentSheetProps {
  connection: MakePermanentConnection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Store the authenticator setup key. Resolves true when it saved. */
  onSave: (
    connection: MakePermanentConnection,
    totpSeed: string,
  ) => Promise<boolean>;
}

type Phase = 'form' | 'working' | 'success';

/** Client-side sanity check so we don't store a rotating code or a partial key. */
function validateSeed(seed: string): string | null {
  const raw = seed.replace(/[\s-]/g, '');
  if (!raw) return 'Paste the setup key from your authenticator settings.';
  if (/^\d{4,8}$/.test(raw)) {
    return 'That looks like a rotating 6-digit code. Paste the longer one-time setup key instead.';
  }
  if (raw.length < 16) {
    return 'Setup keys are usually 16 characters or longer — double-check you copied the whole key.';
  }
  return null;
}

/**
 * Turns an "at-risk" password connection into one that stays signed in on its
 * own, by storing the vendor's authenticator setup key. We generate the 6-digit
 * code at every run from it — the customer enables 2FA on the vendor themselves;
 * we never change their 2FA settings.
 */
export function MakePermanentSheet({
  connection,
  open,
  onOpenChange,
  onSave,
}: MakePermanentSheetProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [seed, setSeed] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the sheet opens or a different connection loads.
  useEffect(() => {
    setPhase('form');
    setSeed('');
    setShowKey(false);
    setError('');
  }, [connection, open]);

  if (!connection) return null;

  const vendorName = connection.displayName || connection.hostname;

  const handleSubmit = async () => {
    const problem = validateSeed(seed);
    if (problem) {
      setError(problem);
      return;
    }
    // Store the normalized Base32 value (formatting spaces/hyphens stripped) — the
    // exact string we validated — so later code generation isn't fed a spaced key.
    const normalized = seed.replace(/[\s-]/g, '');
    setError('');
    setPhase('working');
    try {
      const ok = await onSave(connection, normalized);
      if (ok) {
        setPhase('success');
        return;
      }
      // The parent surfaced why it failed — drop back so they can retry.
      setPhase('form');
    } catch {
      // Never strand the sheet on "Saving…" if the save rejects.
      setPhase('form');
      setError('Something went wrong saving the key. Please try again.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false}>
        <SheetClose
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Close size={16} />
        </SheetClose>

        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span
            className="grid h-8 w-8 flex-none place-items-center rounded-md"
            style={{
              background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
              color: 'color-mix(in oklab, var(--primary) 65%, var(--foreground))',
            }}
          >
            <Locked size={16} />
          </span>
          <SheetTitle>Keep {vendorName} signed in on its own</SheetTitle>
        </div>

        {phase === 'form' && (
          <>
            <SheetBody>
              <div className="flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-foreground">
                  {vendorName} asks for a 6-digit code from an authenticator app when
                  we sign in. Paste your authenticator setup key and Comp AI generates
                  that code at every run — no manual re-sign-ins.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="make-permanent-key"
                    className="text-[12px] text-foreground"
                  >
                    Authenticator setup key
                  </label>
                  <div className="relative">
                    <Input
                      id="make-permanent-key"
                      type={showKey ? 'text' : 'password'}
                      value={seed}
                      onChange={(event) => {
                        setSeed(event.target.value);
                        setError('');
                      }}
                      placeholder="e.g. JBSW Y3DP EHPK 3PXP"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((value) => !value)}
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {showKey ? <ViewOff size={14} /> : <View size={14} />}
                    </button>
                  </div>
                  {error ? (
                    <p className="text-[12px] leading-relaxed text-destructive">
                      {error}
                    </p>
                  ) : (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      The long one-time setup key shown when you add an authenticator
                      app — not the rotating 6-digit code.
                    </p>
                  )}
                </div>

                <MfaSetupHelp hostname={connection.hostname} />

                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  You set up the authenticator on {vendorName} yourself — Comp AI never
                  changes your 2FA settings. This key is only used to generate sign-in
                  codes.
                </p>

                <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Locked size={13} className="flex-none" />
                  Encrypted and stored in your 1Password vault.
                </div>
              </div>
            </SheetBody>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!seed.trim()}>
                Save key
              </Button>
            </div>
          </>
        )}

        {phase === 'working' && (
          <SheetBody>
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <span className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-border border-t-primary" />
              <div className="text-[13px] text-muted-foreground">Saving your key…</div>
            </div>
          </SheetBody>
        )}

        {phase === 'success' && (
          <SheetBody>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span
                className="grid h-12 w-12 place-items-center rounded-full"
                style={{
                  background: 'color-mix(in oklab, var(--success) 14%, transparent)',
                  color: 'color-mix(in oklab, var(--success) 65%, var(--foreground))',
                }}
              >
                <Checkmark size={22} />
              </span>
              <div className="text-[16px] text-foreground">
                {vendorName} now stays signed in on its own
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: 'color-mix(in oklab, var(--success) 14%, transparent)',
                  color: 'color-mix(in oklab, var(--success) 60%, var(--foreground))',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Stays signed in
              </span>
              <p className="max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
                Every future run supplies the 6-digit code automatically — nothing
                changed in your {vendorName} settings.
              </p>
              <div className="mt-2">
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
