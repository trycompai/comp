export interface MarketingStep {
  /** Step label, e.g. "01". Rendered with a "Step " prefix in mono. */
  number: string;
  title: string;
  description: string;
}

interface MarketingStepsProps {
  steps: MarketingStep[];
}

/**
 * Three-column step grid used by "How it works"-style sections. Number of
 * columns mirrors the step count up to 3, then wraps. Feature supplies the
 * step content; layout and typography are fixed.
 */
export function MarketingSteps({ steps }: MarketingStepsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.number}
          className="rounded-md border border-border bg-background p-5"
        >
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Step {step.number}
          </div>
          <div className="mb-1.5 text-[16px] tracking-[-0.005em]">{step.title}</div>
          <div className="text-[12px] leading-[1.55] text-muted-foreground">
            {step.description}
          </div>
        </div>
      ))}
    </div>
  );
}
