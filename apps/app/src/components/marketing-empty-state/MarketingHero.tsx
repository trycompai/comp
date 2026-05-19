import type { ReactNode } from 'react';

interface MarketingHeroProps {
  /** ALL-CAPS small eyebrow above the headline. Optional. */
  eyebrow?: string;
  /** Headline content. Use `accentWord` to highlight a single word in primary. */
  titleBefore?: string;
  accentWord?: string;
  titleAfter?: string;
  /** One or more body paragraphs. First gets foreground color, rest are muted. */
  paragraphs: ReactNode[];
  /** Right-aligned action row. */
  actions?: ReactNode;
  /** Right-column slot — feature-specific preview (mini list, screenshot, etc.). */
  preview?: ReactNode;
  /** Small ALL-CAPS pill anchored to the top-left of the preview slot. */
  previewAnnotation?: string;
}

/**
 * 60/40 hero band — left side carries the marketing copy, right side carries
 * a feature-supplied preview surface. Feature owns the preview content; this
 * component only owns the layout, padding, and annotation pill position.
 */
export function MarketingHero({
  eyebrow,
  titleBefore,
  accentWord,
  titleAfter,
  paragraphs,
  actions,
  preview,
  previewAnnotation,
}: MarketingHeroProps) {
  const [first, ...rest] = paragraphs;
  return (
    <div className="grid gap-7 rounded-xl border border-border bg-muted/55 p-5 sm:gap-8 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-9">
      <div>
        {eyebrow && (
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:mb-4">
            {eyebrow}
          </div>
        )}
        <h2 className="m-0 max-w-[540px] text-[28px] font-normal leading-[1.08] tracking-[-0.022em] sm:text-[34px] sm:leading-[1.05] lg:text-[40px]">
          {titleBefore}
          {accentWord && (
            <>
              {titleBefore ? ' ' : ''}
              <span className="text-primary">{accentWord}</span>
              {titleAfter ? ' ' : ''}
            </>
          )}
          {titleAfter}
        </h2>
        {first !== undefined && (
          <p className="mt-4 max-w-[520px] text-[14px] leading-[1.6] text-foreground sm:text-[15px]">
            {first}
          </p>
        )}
        {rest.map((paragraph, i) => (
          <p
            key={i}
            className="mt-3 max-w-[520px] text-[13px] leading-[1.55] text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
        {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {preview && (
        <div className="relative">
          {previewAnnotation && (
            <div className="absolute -left-2.5 -top-2.5 z-[2] rounded-sm bg-foreground px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-background">
              {previewAnnotation}
            </div>
          )}
          {preview}
        </div>
      )}
    </div>
  );
}
