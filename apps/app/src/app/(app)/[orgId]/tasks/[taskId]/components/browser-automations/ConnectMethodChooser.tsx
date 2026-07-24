'use client';

import { Button } from '@trycompai/design-system';
import { useState } from 'react';
import type { LoginAnalysis } from '../../hooks/types';

/**
 * password = we sign in for you;
 * sso = the AI opens your identity provider, then you finish there;
 * live = you sign in yourself in the browser (fallback when nothing is detected).
 */
export type ConnectMethodKind = 'password' | 'sso' | 'live';

interface MethodOption {
  kind: Exclude<ConnectMethodKind, 'live'>;
  title: string;
  detail: string;
  recommended?: boolean;
}

// Only methods we can actually drive. Passkey is deliberately never an option —
// passkeys are device-bound (WebAuthn) and can't be completed from a remote
// cloud browser; we call that out plainly instead of offering a dead end.
function optionsFor(analysis: LoginAnalysis): MethodOption[] {
  const methods = analysis.detectedMethods;
  const options: MethodOption[] = [];
  if (methods.includes('password')) {
    options.push({
      kind: 'password',
      title: 'Email & password',
      detail: 'We sign in for you — runs unattended.',
      recommended: true,
    });
  }
  if (methods.includes('sso')) {
    options.push({
      kind: 'sso',
      title: 'Single sign-on (SSO)',
      detail: 'You finish the login in your provider once; we reuse the session.',
    });
  }
  return options;
}

interface ConnectMethodChooserProps {
  analysis: LoginAnalysis;
  onChoose: (kind: ConnectMethodKind) => void;
  onCancel: () => void;
}

function PasskeyGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="5" cy="11" r="2.5" />
      <path d="M7 9l6.5-6.5M10.5 5.5L12.5 7.5M12 4l1.5 1.5" />
    </svg>
  );
}

export function ConnectMethodChooser({ analysis, onChoose, onCancel }: ConnectMethodChooserProps) {
  const methods = analysis.detectedMethods;
  const options = optionsFor(analysis);
  const hasPasskey = methods.includes('passkey');
  const [selected, setSelected] = useState<MethodOption['kind']>(options[0]?.kind ?? 'password');

  // Passkey-only — no path works in a cloud browser; say so plainly.
  if (options.length === 0 && hasPasskey) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-col items-center gap-2.5 px-3 pb-1 pt-4 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <PasskeyGlyph size={17} />
          </span>
          <div className="text-[13px] text-foreground">This site only supports passkey sign-in</div>
          <p className="max-w-[320px] text-[11.5px] leading-relaxed text-muted-foreground">
            Passkeys are bound to your device, so Comp&apos;s cloud browser can&apos;t sign in
            unattended. Ask the vendor to enable a password or SSO login — or capture this
            evidence manually.
          </p>
        </div>
        <Button variant="outline" width="full" onClick={() => onChoose('live')}>
          Capture evidence manually
        </Button>
        <div>
          <Button variant="ghost" onClick={onCancel}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Nothing usable detected — offer a manual sign-in in the live browser.
  if (options.length === 0) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-col items-center gap-2.5 px-3 pb-1 pt-4 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3.5M8 11h.01" />
            </svg>
          </span>
          <div className="text-[13px] text-foreground">No sign-in method detected</div>
          <p className="max-w-[320px] text-[11.5px] leading-relaxed text-muted-foreground">
            We couldn&apos;t find a usable sign-in form on this page. Open a live browser and
            sign in yourself — we&apos;ll save the session for scheduled captures.
          </p>
        </div>
        <Button width="full" onClick={() => onChoose('live')}>
          Sign in manually
        </Button>
        <div>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="text-base text-foreground">Choose how to sign in</div>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const active = option.kind === selected;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setSelected(option.kind)}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/[0.04]'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <span
                className={`mt-0.5 grid h-3.5 w-3.5 flex-none place-items-center rounded-full border ${
                  active ? 'border-primary' : 'border-muted-foreground/40'
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="text-[12.5px] text-foreground">{option.title}</span>
                  {option.recommended && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  {option.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* The site also offers passkey — warn before the user hits the vendor's
          own passkey button and gets stuck (it can't work in our browser). */}
      {hasPasskey && (
        <div className="flex items-start gap-2 rounded-md bg-muted p-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
          <span className="mt-0.5 flex-none">
            <PasskeyGlyph size={12} />
          </span>
          <span>
            This site also offers passkey / security key sign-in. Passkeys are tied to your
            device, so they won&apos;t work in Comp&apos;s browser — use email &amp; password, or
            finish the SSO login when prompted.
          </span>
        </div>
      )}

      <Button width="full" onClick={() => onChoose(selected)}>
        Continue
      </Button>
      <div>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
