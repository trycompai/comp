'use client';

/**
 * Concise but specific explanation of how the treatment-impact score is
 * computed. Uses real GRC vocabulary and shows the actual formulas a CISO
 * would expect to see (5x5 matrix, ceil(raw/2.5) normalization, linear
 * interpolation by task completion).
 *
 * Does NOT publish the exact step-down counts per strategy — those live in
 * `lib/suggested-residual.ts` and may evolve as we calibrate against
 * customer feedback. Strategy effects are described qualitatively (which
 * axes move, why) without naming the step magnitudes.
 */
export function ScoreExplainer() {
  return (
    <div className="flex flex-col gap-3 text-[13px] leading-[1.55] text-foreground">
      <div className="text-sm font-medium">How this score is calculated</div>

      <Section title="1 · Inherent score (1–10)">
        We rate likelihood (Very Unlikely → Very Likely) and impact
        (Insignificant → Severe) on a standard 5×5 matrix, each axis indexed
        1 to 5.
        <Formula
          lines={[
            'raw = likelihood × impact   →   1..25',
            'score = ⌈raw ÷ 2.5⌉          →   1..10',
          ]}
        />
        Risk levels (Negligible · Low · Medium · High · Critical) map from
        bands of the raw score.
      </Section>

      <Section title="2 · Treatment target">
        Each strategy projects a residual along defined axes:
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Mitigate</span> —
            linked controls and tasks reduce <em>both</em> likelihood and
            impact. The target re-runs the matrix math on the reduced inputs
            and re-normalizes to 1–10.
          </li>
          <li>
            <span className="font-medium text-foreground">Transfer</span> —
            insurance or contractual indemnity shifts financial impact but
            doesn't change the probability of an event. The target reduces
            impact only; likelihood stays at inherent.
          </li>
          <li>
            <span className="font-medium text-foreground">Accept</span> —
            residual equals inherent. No reduction; rationale is documented
            on the plan.
          </li>
          <li>
            <span className="font-medium text-foreground">Avoid</span> —
            the activity that produces the risk is discontinued, so once
            execution is in place the residual pins to the floor (likelihood
            and impact both at their lowest).
          </li>
        </ul>
      </Section>

      <Section title="3 · Coverage gate">
        Strategies that require operational evidence (Mitigate, Transfer,
        Avoid) only project a target reduction when at least one task is
        linked to the risk. Without linked work, the target collapses back
        to inherent — the strategy alone isn't audit evidence. Accept is
        unaffected (its target is inherent by definition).
      </Section>

      <Section title="4 · Current vs. target">
        For Mitigate, the displayed score interpolates linearly between
        inherent and target by task completion:
        <Formula
          lines={[
            'completion = (tasks done OR not_relevant) ÷ total linked tasks',
            'current = inherent − (inherent − target) × completion',
          ]}
        />
        At 0% complete the score equals inherent; at 100% it equals the
        target. Non-Mitigate strategies are treated as fully executed by
        definition (the strategy itself <em>is</em> the action), so their
        current and target are the same.
      </Section>

      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
        <div className="font-bold uppercase tracking-[0.06em]">References</div>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>
            <a
              href="https://csrc.nist.gov/pubs/sp/800/30/r1/final"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-2 hover:underline focus-visible:underline"
            >
              NIST SP 800-30 Rev. 1
            </a>{' '}
            — recognizes 5×5 matrices as a valid semi-quantitative risk
            assessment approach (Appendix I).
          </li>
          <li>
            <a
              href="https://www.iso.org/standard/80585.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-2 hover:underline focus-visible:underline"
            >
              ISO/IEC 27005:2022
            </a>{' '}
            — defines our treatment categories: <em>risk modification</em>{' '}
            (Mitigate), <em>risk sharing</em> (Transfer), <em>risk
            retention</em> (Accept).
          </li>
        </ul>
        <div className="mt-1.5 italic">
          The matrix structure and treatment categories align with these
          standards; the specific 1–10 normalization and step-down magnitudes
          are Comp AI's calibration.
        </div>
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
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Formula({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-1.5 mb-1 overflow-x-auto rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] leading-[1.55] text-foreground/80">
      {lines.join('\n')}
    </pre>
  );
}
