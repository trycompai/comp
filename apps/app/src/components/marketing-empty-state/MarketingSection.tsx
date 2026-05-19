import type { ReactNode } from 'react';

interface MarketingSectionProps {
  title: string;
  /** Right-aligned muted note next to the section title. */
  note?: string;
  children: ReactNode;
}

/**
 * The repeating "section header row + body" pattern. Renders an h3 with an
 * optional right-aligned muted note, then the supplied children. Use it for
 * "How it works", "What's included", and any analogous block.
 */
export function MarketingSection({ title, note, children }: MarketingSectionProps) {
  return (
    <section>
      <div className="mb-3 flex flex-col gap-1 lg:mb-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
        <h3 className="m-0 text-[18px] font-normal tracking-[-0.008em] sm:text-[20px]">{title}</h3>
        {note && (
          <span className="text-[12px] text-muted-foreground lg:text-right">{note}</span>
        )}
      </div>
      {children}
    </section>
  );
}
