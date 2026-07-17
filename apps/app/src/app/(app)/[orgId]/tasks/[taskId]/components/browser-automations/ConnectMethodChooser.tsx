'use client';

import { Button } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import type { LoginAnalysis } from '../../hooks/types';

/** password = we sign in for you; live = the user signs in in the browser. */
export type ConnectMethodKind = 'password' | 'live';

interface MethodOption {
  kind: ConnectMethodKind;
  title: string;
  detail: string;
  recommended?: boolean;
}

// Turn detected methods into an ordered chooser — the automatable one first.
// Passkey is deliberately excluded: passkeys are device-bound (WebAuthn) and
// can't be completed from a remote cloud browser, so offering it would be a dead
// end. The passkey-only case is handled with a clear message instead.
function optionsFor(analysis: LoginAnalysis): MethodOption[] {
  const methods = analysis.detectedMethods;
  const options: MethodOption[] = [];

  if (methods.includes('password')) {
    options.push({
      kind: 'password',
      title: 'Email & password',
      detail: 'We sign in for you — runs unattended after this.',
      recommended: true,
    });
  }
  if (methods.includes('sso')) {
    options.push({
      kind: 'live',
      title: 'Single sign-on (SSO)',
      detail: "You sign in once; we'll email you if it needs a refresh.",
    });
  }
  return options;
}

interface ConnectMethodChooserProps {
  analysis: LoginAnalysis;
  onChoose: (kind: ConnectMethodKind) => void;
  onCancel: () => void;
}

export function ConnectMethodChooser({
  analysis,
  onChoose,
  onCancel,
}: ConnectMethodChooserProps) {
  const methods = analysis.detectedMethods;
  const options = optionsFor(analysis);

  // A passkey-only site has no path that works in a cloud browser — say so plainly
  // rather than offering a sign-in that can never complete.
  if (options.length === 0 && methods.includes('passkey')) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="text-base text-foreground">This site only supports passkeys</div>
        <div className="rounded-md border border-border bg-muted p-2.5 text-xs leading-relaxed text-muted-foreground">
          Passkeys are tied to a physical device, so they can’t be used from Comp’s
          cloud browser — this site can’t be connected here. If the vendor also allows
          a password or SSO login, enable one of those and try again.
        </div>
        <div>
          <Button variant="ghost" onClick={onCancel}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Nothing usable detected — let the user try a manual sign-in in the live browser.
  if (options.length === 0) {
    options.push({
      kind: 'live',
      title: 'Sign in manually',
      detail: "We'll open the browser for you to sign in.",
    });
  }

  // "Email & password" is the only method we can replay on a schedule; SSO needs
  // the person, so warn up front when that's all the site offers.
  const showCheckInNote = !methods.includes('password') && methods.includes('sso');

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="text-base text-foreground">Choose how to sign in</div>
      {showCheckInNote && (
        <div className="rounded-md border border-border bg-muted p-2.5 text-xs text-muted-foreground leading-relaxed">
          This site uses single sign-on, so it needs you to sign in and can’t run
          fully unattended. You can still connect — we’ll keep the session alive and
          email you when it needs a manual refresh.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <button
            key={`${option.title}-${index}`}
            type="button"
            onClick={() => onChoose(option.kind)}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{option.title}</span>
                {option.recommended && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    Recommended
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{option.detail}</span>
            </div>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
      <div>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
