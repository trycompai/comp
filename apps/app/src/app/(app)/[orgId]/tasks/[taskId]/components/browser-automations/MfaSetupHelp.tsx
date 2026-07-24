'use client';

import { useState } from 'react';
import { useMfaInstructions } from '../../hooks/useMfaInstructions';

interface MfaSetupHelpProps {
  /** The vendor sign-in URL or hostname the steps are generated for. */
  hostname?: string;
}

/**
 * Collapsible "How do I find this key?" helper shown next to the authenticator
 * setup-key field. Steps are generated per vendor by the API (no hardcode) and
 * fetched lazily — only once the user opens the panel.
 */
export function MfaSetupHelp({ hostname }: MfaSetupHelpProps) {
  const [open, setOpen] = useState(false);
  const { instructions, isLoading, error } = useMfaInstructions(hostname, open);

  return (
    <details
      className="group rounded-md border border-border"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11.5px] text-foreground [&::-webkit-details-marker]:hidden">
        <span>How do I find this key{hostname ? ` for ${hostname}` : ''}?</span>
        <span className="text-muted-foreground transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="flex flex-col gap-2.5 border-t border-border px-3 py-3">
        {isLoading && (
          <p className="text-[11px] text-muted-foreground">Looking up the steps…</p>
        )}

        {!isLoading && error && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Couldn&apos;t load steps. Open your account&apos;s Security / Two-factor
            settings, add an authenticator app, and choose &ldquo;enter code
            manually&rdquo; to copy the setup key.
          </p>
        )}

        {instructions && (
          <>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-[11.5px] leading-relaxed text-foreground">
              {instructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>

            {instructions.source === 'fallback' && (
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                These are generic steps — the exact menu names may differ for this
                vendor.
              </p>
            )}

            {instructions.source === 'generated' && instructions.grounded && (
              <p className="flex items-center gap-1 text-[10.5px] leading-relaxed text-muted-foreground">
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--success)' }} />
                Checked against this vendor&apos;s current help docs.
              </p>
            )}

            {instructions.tips.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-border pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                {instructions.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
