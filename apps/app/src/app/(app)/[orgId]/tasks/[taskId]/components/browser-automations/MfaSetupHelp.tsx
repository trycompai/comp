'use client';

import { useState } from 'react';
import { useMfaInstructions } from '../../hooks/useMfaInstructions';

interface MfaSetupHelpProps {
  /** The vendor sign-in URL or hostname the steps are generated for. */
  hostname?: string;
}

function formatCheckedAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // Anchor to UTC so the label matches the server's date and doesn't shift by
  // the viewer's timezone (a date-only freshness signal).
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const mutedPanel = { background: 'color-mix(in oklab, var(--muted) 55%, transparent)' };

/**
 * "How do I find this key?" helper (design 2a — quiet disclosure). A muted
 * link-row opens a soft panel with per-vendor numbered steps and a single footer
 * line that carries the trust signal (grounded in current docs) or the honest
 * generic-fallback note. Steps are fetched lazily — only once the panel opens.
 */
export function MfaSetupHelp({ hostname }: MfaSetupHelpProps) {
  const [open, setOpen] = useState(false);
  const { instructions, isLoading, error, retry } = useMfaInstructions(hostname, open);

  const forVendor = hostname ? ` for ${hostname}` : '';
  const showSteps = Boolean(instructions);
  const isFallback = instructions?.source === 'fallback';
  const isGrounded = instructions?.source === 'generated' && instructions.grounded;
  const checkedOn = instructions ? formatCheckedAt(instructions.checkedAt) : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          className="shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M6.2 6.1a1.8 1.8 0 113 1.4c-.6.5-1.2.8-1.2 1.6M8 11.4h.01" />
        </svg>
        <span>How do I find this key{forVendor}?</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div
          className="flex flex-col gap-2.5 rounded-md border border-border p-3"
          style={mutedPanel}
        >
          {isLoading && (
            <>
              <p className="text-[11px] text-muted-foreground">
                Looking up the steps{forVendor}…
              </p>
              {['88%', '72%', '80%'].map((width) => (
                <span
                  key={width}
                  className="h-2 rounded"
                  style={{
                    width,
                    background: 'color-mix(in oklab, var(--foreground) 8%, transparent)',
                  }}
                />
              ))}
            </>
          )}

          {!isLoading && error && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Couldn&apos;t load the steps{forVendor}. Use the vendor&apos;s 2FA settings
              page, or{' '}
              <button
                type="button"
                onClick={() => retry()}
                className="cursor-pointer text-foreground underline underline-offset-2"
              >
                try again
              </button>
              .
            </p>
          )}

          {!isLoading && !error && showSteps && instructions && (
            <>
              <div className="flex flex-col gap-2">
                {instructions.steps.map((step, index) => (
                  <div key={index} className="flex gap-2.5">
                    <span className="w-3 shrink-0 pt-0.5 text-right font-mono text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 text-[11.5px] leading-[1.55] text-foreground">
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {isGrounded && (
                <div className="flex items-start gap-1.5 border-t border-border pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="1.6"
                    className="mt-px shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M3 8.5l3 3L13 4" />
                  </svg>
                  <span>
                    Checked against {hostname || 'the vendor'}&apos;s current help docs
                    {checkedOn ? ` · ${checkedOn}` : ''}
                  </span>
                </div>
              )}

              {isFallback && (
                <div
                  className="rounded-sm px-2.5 py-1.5 text-[10.5px] leading-relaxed text-foreground"
                  style={{ background: 'color-mix(in oklab, var(--warning) 12%, transparent)' }}
                >
                  Generic steps — menu names{forVendor} may differ. Double-check as you go.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
