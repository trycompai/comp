'use client';

/**
 * Concise explanation of how the treatment-impact score is computed, surfaced
 * via a Popover from the hero's "How is this calculated?" affordance.
 *
 * The copy is deliberately CISO-ready (5×5 matrix, NIST/ISO references, named
 * strategy outcomes) but does NOT publish the exact step-down coefficients —
 * those live in `lib/suggested-residual.ts` and may evolve as we calibrate.
 */
export function ScoreExplainer() {
  return (
    <div className="flex flex-col gap-3 text-[13px] leading-[1.55] text-foreground">
      <div className="text-sm font-medium">How this score is calculated</div>

      <Section title="Inherent risk (1–10)">
        A standard 5×5 risk matrix scores likelihood × impact and normalizes
        the result onto a 1–10 scale.
      </Section>

      <Section title="Treatment target">
        Each strategy projects a residual:
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Mitigate</span> —
            reduces both likelihood and impact through linked controls and
            tasks.
          </li>
          <li>
            <span className="font-medium text-foreground">Transfer</span> —
            reduces impact via cyber insurance or contractual indemnity.
          </li>
          <li>
            <span className="font-medium text-foreground">Accept</span> —
            residual equals inherent; rationale documented.
          </li>
          <li>
            <span className="font-medium text-foreground">Avoid</span> — pinned
            to the lowest level; activity eliminated.
          </li>
        </ul>
      </Section>

      <Section title="Current vs. target">
        For Mitigate plans, the current score moves between inherent and
        target as linked tasks are completed (or marked not relevant). 0%
        complete shows inherent; 100% shows the target.
      </Section>

      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
        Aligns with NIST SP 800-30 / ISO 27005 risk-assessment guidance.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
