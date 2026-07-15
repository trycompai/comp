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
  if (methods.includes('passkey')) {
    options.push({
      kind: 'live',
      title: 'Passkey',
      detail: "Can't be automated — sign in once in the browser.",
    });
  }
  if (options.length === 0) {
    options.push({
      kind: 'live',
      title: 'Sign in manually',
      detail: "We'll open the browser for you to sign in.",
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
  const options = optionsFor(analysis);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="text-base text-foreground">Choose how to sign in</div>
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
