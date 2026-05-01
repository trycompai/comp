'use client';

import { getRiskLevel, getRiskScore, type RiskLevel } from '@/lib/risk-score';
import { suggestedResidual } from '@/lib/suggested-residual';
import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { Card, CardContent } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { RiskMatrix5x5 } from './RiskMatrix5x5';
import { RiskScale } from './RiskScale';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'LOW',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  'very-high': 'CRITICAL',
};

const LEVEL_COLOR: Record<RiskLevel, string> = {
  'very-low': 'oklch(0.45 0.14 145)',
  low: 'oklch(0.45 0.14 145)',
  medium: 'oklch(0.5 0.14 85)',
  high: 'oklch(0.5 0.18 50)',
  'very-high': 'var(--destructive)',
};

const LIKELIHOOD_DISPLAY: Record<Likelihood, string> = {
  very_unlikely: 'Very Unlikely',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  very_likely: 'Very Likely',
};

const IMPACT_DISPLAY: Record<Impact, string> = {
  insignificant: 'Insignificant',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  severe: 'Severe',
};

interface TreatmentHeroProps {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  strategy: RiskTreatmentType;
  tasks: { status: TaskStatus }[];
}

export function TreatmentHero({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
  strategy,
  tasks,
}: TreatmentHeroProps) {
  const inherent = getRiskScore(inherentLikelihood, inherentImpact);
  const residual = getRiskScore(residualLikelihood, residualImpact);
  const delta = inherent.score - residual.score;
  const inherentLevel = getRiskLevel(inherent.raw);
  const residualLevel = getRiskLevel(residual.raw);

  const completion = suggestedResidual({
    likelihood: inherentLikelihood,
    impact: inherentImpact,
    strategy,
    tasks,
  }).completion;
  const completionPct = Math.round(completion * 100);

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          {/* LEFT: narrative */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Risk Reduction — Treatment Impact
            </div>
            <h1
              className="my-3 flex items-center gap-4 font-mono tabular-nums text-7xl font-normal leading-[0.95] tracking-[-0.05em] md:text-8xl"
              aria-label={`From ${inherent.score} to ${residual.score} out of 10`}
            >
              <span className="text-destructive opacity-85">
                {inherent.score}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
              <ArrowRight size={28} className="text-muted-foreground" aria-hidden="true" />
              <span className="text-primary">
                {residual.score}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
            </h1>
            <p className="max-w-[540px] text-base leading-[1.55] text-foreground">
              The plan moves this risk from{' '}
              <strong
                className="font-bold"
                style={{ color: LEVEL_COLOR[inherentLevel] }}
              >
                {LEVEL_LABEL[inherentLevel]}
              </strong>{' '}
              to{' '}
              <strong
                className="font-bold"
                style={{ color: LEVEL_COLOR[residualLevel] }}
              >
                {LEVEL_LABEL[residualLevel]}
              </strong>{' '}
              —{' '}
              {delta === 0 ? (
                <span className="font-mono font-bold text-primary tabular-nums">no change</span>
              ) : (
                <>
                  a{' '}
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {delta > 0 ? '−' : '+'}
                    {Math.abs(delta)}
                  </span>{' '}
                  point swing
                </>
              )}{' '}
              assuming linked tasks complete on schedule.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <HeroStatPair
                label="Likelihood"
                from={LIKELIHOOD_DISPLAY[inherentLikelihood]}
                to={LIKELIHOOD_DISPLAY[residualLikelihood]}
              />
              <HeroStatPair
                label="Impact"
                from={IMPACT_DISPLAY[inherentImpact]}
                to={IMPACT_DISPLAY[residualImpact]}
              />
              <HeroStatSingle label="Task Completion" value={`${completionPct}%`} />
            </div>
          </div>

          {/* RIGHT: matrix */}
          <RiskMatrix5x5
            inherentLikelihood={inherentLikelihood}
            inherentImpact={inherentImpact}
            residualLikelihood={residualLikelihood}
            residualImpact={residualImpact}
          />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <RiskScale inherentScore={inherent.score} residualScore={residual.score} />
        </div>
      </CardContent>
    </Card>
  );
}

function HeroStatPair({ label, from, to }: { label: string; from: string; to: string }) {
  const sameValue = from === to;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-sm">
        <span
          className={
            sameValue
              ? 'text-foreground'
              : 'text-muted-foreground line-through decoration-muted-foreground'
          }
        >
          {from}
        </span>
        {!sameValue && (
          <>
            <ArrowRight size={12} className="text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground">{to}</span>
          </>
        )}
      </div>
    </div>
  );
}

function HeroStatSingle({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-normal tabular-nums tracking-[-0.02em] text-primary">
        {value}
      </div>
    </div>
  );
}
