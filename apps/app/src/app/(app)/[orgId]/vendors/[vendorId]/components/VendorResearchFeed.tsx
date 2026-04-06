'use client';

import { Text } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import { motion } from 'motion/react';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';

export type MessageType = 'searching' | 'found' | 'analyzing' | 'error';

export type ResearchMessage = {
  text: string;
  type: MessageType;
  timestamp: number;
  url?: string;
};

interface VendorResearchFeedProps {
  messages: ResearchMessage[];
  isActive: boolean;
  vendorName?: string;
}

type Finding = {
  label: string;
  kind: 'cert' | 'link' | 'assessment' | 'news';
  id: string;
  url?: string;
};

function parseFindings(messages: ResearchMessage[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    if (msg.type !== 'found') continue;
    const text = msg.text;
    const url = msg.url;

    if (text === 'Security assessment complete') {
      if (!seen.has('__assessment__')) {
        seen.add('__assessment__');
        findings.push({
          label: 'Security Assessment',
          kind: 'assessment',
          id: '__assessment__',
        });
      }
      continue;
    }

    if (text.startsWith('Found: ')) {
      const title = text.slice(7);
      const id = `news-${title}`;
      if (!seen.has(id)) {
        seen.add(id);
        findings.push({ label: title, kind: 'news', id, url });
      }
      continue;
    }

    const match = text.match(/^Found (.+?)(?:\s+certification)?$/);
    if (match) {
      const name = match[1]!;
      const id = name.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);

      const linkKeywords = [
        'trust',
        'privacy',
        'terms',
        'security overview',
        'soc 2 report',
      ];
      const isLink = linkKeywords.some((kw) =>
        name.toLowerCase().includes(kw),
      );
      findings.push({ label: name, kind: isLink ? 'link' : 'cert', id, url });
    }
  }

  return findings;
}

/** Build scan path using measured pixel positions relative to grid. */
function buildScanPath(
  pendingIndices: number[],
  centers: Array<{ x: number; y: number }>,
) {
  const tops: string[] = [];
  const lefts: string[] = [];
  const times: number[] = [];

  // Grid indices: 0=TL, 1=TR, 2=BL, 3=BR
  // Clockwise visual order: TL(0) → TR(1) → BR(3) → BL(2)
  const clockwiseOrder = [0, 1, 3, 2];
  const pending = clockwiseOrder.filter(
    (i) => pendingIndices.includes(i) && centers[i],
  );
  if (pending.length === 0) return { tops, lefts, times };

  const n = pending.length;
  const circleRadiusPx = 25;
  const circleFraction = n === 1 ? 0.85 : 0.7 / n;
  const travelFraction = n === 1 ? 0.15 : 0.3 / n;
  const steps = 32;
  let t = 0;

  for (const idx of pending) {
    const c = centers[idx]!;
    for (let s = 0; s <= steps; s++) {
      const progress = s / steps;
      const angle = progress * Math.PI * 2;
      const ramp = Math.sin(progress * Math.PI);
      const dx = Math.round(circleRadiusPx * ramp * Math.sin(angle));
      const dy = Math.round(-circleRadiusPx * ramp * Math.cos(angle));
      tops.push(`${c.y + dy}px`);
      lefts.push(`${c.x + dx}px`);
      times.push(t + circleFraction * progress);
    }
    t += circleFraction + travelFraction;
  }

  const first = centers[pending[0]!]!;
  tops.push(`${first.y}px`);
  lefts.push(`${first.x}px`);
  times.push(1);

  return { tops, lefts, times };
}

function ScanningGlass({
  onCardChange,
  pendingIndices,
  gridRef,
  cardRefs,
}: {
  onCardChange: (index: number) => void;
  pendingIndices: number[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  cardRefs: React.RefObject<Array<HTMLDivElement | null>>;
}) {
  const [centers, setCenters] = useState<Array<{ x: number; y: number }>>([]);
  const lastCardRef = useRef(-1);

  // Measure card centers relative to grid
  useEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      const cards = cardRefs.current;
      if (!grid || !cards) return;
      const gridRect = grid.getBoundingClientRect();
      setCenters(
        cards.map((card) => {
          if (!card) return { x: 0, y: 0 };
          const r = card.getBoundingClientRect();
          return {
            x: r.left - gridRect.left + r.width / 2,
            y: r.top - gridRect.top + r.height / 2,
          };
        }),
      );
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (gridRef.current) obs.observe(gridRef.current);
    cardRefs.current?.forEach((c) => c && obs.observe(c));
    return () => obs.disconnect();
  }, [gridRef, cardRefs, pendingIndices]);

  const { tops, lefts, times } = useMemo(
    () => buildScanPath(pendingIndices, centers),
    [pendingIndices, centers],
  );

  if (tops.length === 0 || centers.length === 0) return null;

  const duration = pendingIndices.length === 1 ? 4 : pendingIndices.length * 3;

  return (
    <motion.div
      key={`${pendingIndices.join(',')}-${centers.map((c) => `${Math.round(c.x)},${Math.round(c.y)}`).join('|')}`}
      className="pointer-events-none absolute z-10 -translate-x-[18px] -translate-y-[18px]"
      animate={{ top: tops, left: lefts }}
      transition={{
        duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
        times,
      }}
      onUpdate={(latest) => {
        const val = (v: unknown) => Number.parseFloat(String(v));
        const top = val(latest.top);
        const left = val(latest.left);
        if (Number.isNaN(top) || Number.isNaN(left) || centers.length === 0)
          return;
        let closest = -1;
        let minDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < centers.length; i++) {
          const c = centers[i]!;
          const dist = (top - c.y) ** 2 + (left - c.x) ** 2;
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        }
        if (closest !== lastCardRef.current) {
          lastCardRef.current = closest;
          onCardChange(closest);
        }
      }}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        className="drop-shadow-md"
      >
        <circle cx="15" cy="15" r="14" className="fill-primary/10" />
        <circle
          cx="15"
          cy="15"
          r="10"
          className="stroke-primary"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="15" cy="15" r="6" className="fill-primary/[0.06]" />
        <line
          x1="23"
          y1="23"
          x2="33"
          y2="33"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function CategoryCard({
  label,
  items,
  isActive,
  color,
  highlighted,
  cardRef,
}: {
  label: string;
  items: Finding[];
  isActive: boolean;
  color: 'success' | 'primary';
  highlighted: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const done = items.length > 0;

  return (
    <motion.div
      ref={cardRef}
      layout
      className={`rounded-lg border p-4 transition-all duration-500 ${
        done
          ? 'border-border bg-card shadow-sm'
          : highlighted
            ? 'border-primary/30 bg-muted/40 shadow-md ring-1 ring-primary/10'
            : 'border-dashed border-border/60 bg-muted/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {done ? (
            <Checkmark size={14} className="text-success" />
          ) : isActive ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20" />
          )}
          <span
            className={`text-sm font-medium ${
              done ? 'text-card-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
        </div>
        {done && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              color === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {items.length} found
          </motion.span>
        )}
      </div>

      {done && color === 'success' ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <motion.span
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-success/[0.06] text-card-foreground ${item.url ? 'cursor-pointer hover:bg-success/[0.12] transition-colors' : ''}`}
              onClick={item.url ? () => window.open(item.url, '_blank', 'noopener,noreferrer') : undefined}
            >
              <Checkmark size={10} className="text-success shrink-0" />
              <span className="truncate max-w-[200px]">{item.label}</span>
            </motion.span>
          ))}
        </div>
      ) : done ? (
        <div className="space-y-0.5">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline-offset-4 hover:underline truncate block"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground truncate block">
                  {item.label}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      ) : isActive ? (
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded-md bg-muted animate-pulse [animation-delay:200ms]" />
          <div className="h-6 w-14 rounded-md bg-muted animate-pulse [animation-delay:400ms]" />
        </div>
      ) : null}
    </motion.div>
  );
}

export function VendorResearchFeed({
  messages,
  isActive,
  vendorName,
}: VendorResearchFeedProps) {
  const findings = useMemo(() => parseFindings(messages), [messages]);
  const [activeCard, setActiveCard] = useState(-1);
  const handleCardChange = useCallback((index: number) => {
    setActiveCard(index);
  }, []);

  const certs = findings.filter((f) => f.kind === 'cert');
  const links = findings.filter((f) => f.kind === 'link');
  const assessments = findings.filter((f) => f.kind === 'assessment');
  const news = findings.filter((f) => f.kind === 'news');
  const totalFindings = findings.length;

  const pendingIndices = useMemo(() => {
    const indices: number[] = [];
    if (certs.length === 0) indices.push(0);
    if (links.length === 0) indices.push(1);
    if (assessments.length === 0) indices.push(2);
    if (news.length === 0) indices.push(3);
    return indices;
  }, [certs.length, links.length, assessments.length, news.length]);

  // Refs for measuring card positions dynamically
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null]);
  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    [],
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="space-y-0.5">
          <Text size="sm" weight="semibold">
            {isActive
              ? `Researching ${vendorName ?? 'vendor'} security posture`
              : 'Research complete'}
          </Text>
          {isActive && (
            <Text size="xs" variant="muted">
              This may take 1-10 minutes depending on the vendor. You can leave this page, we'll notify you when it's done.
            </Text>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalFindings > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalFindings} {totalFindings === 1 ? 'finding' : 'findings'}
            </span>
          )}
        </div>
      </div>

      {/* Category cards grid — with scanning glass overlay */}
      <div ref={gridRef} className="px-5 pb-5 grid grid-cols-2 gap-3 relative">
        {isActive && pendingIndices.length > 0 && (
          <ScanningGlass
            onCardChange={handleCardChange}
            pendingIndices={pendingIndices}
            gridRef={gridRef}
            cardRefs={cardRefs}
          />
        )}
        <CategoryCard
          label="Certifications"
          items={certs}
          isActive={isActive}
          color="success"
          highlighted={activeCard === 0}
          cardRef={setCardRef(0)}
        />
        <CategoryCard
          label="Security Links"
          items={links}
          isActive={isActive}
          color="primary"
          highlighted={activeCard === 1}
          cardRef={setCardRef(1)}
        />
        <CategoryCard
          label="Security Assessment"
          items={assessments}
          isActive={isActive}
          color="success"
          highlighted={activeCard === 2}
          cardRef={setCardRef(2)}
        />
        <CategoryCard
          label="Recent News"
          items={news}
          isActive={isActive}
          color="primary"
          highlighted={activeCard === 3}
          cardRef={setCardRef(3)}
        />
      </div>
    </div>
  );
}
