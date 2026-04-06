'use client';

import { Text } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import { motion } from 'motion/react';
import { useMemo, useState, useRef, useCallback } from 'react';

export type MessageType = 'searching' | 'found' | 'analyzing' | 'error';

export type ResearchMessage = {
  text: string;
  type: MessageType;
  timestamp: number;
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
};

function parseFindings(messages: ResearchMessage[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    if (msg.type !== 'found') continue;
    const text = msg.text;

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
        findings.push({ label: title, kind: 'news', id });
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
      findings.push({ label: name, kind: isLink ? 'link' : 'cert', id });
    }
  }

  return findings;
}

/**
 * CSS magnifying glass that floats over the card grid, scanning each card.
 * Positioned absolute over the grid — the parent must be relative.
 */
// All 4 card center positions in the 2x2 grid
const CARD_CENTERS = [
  { left: 25, top: 22 }, // 0: top-left (Certifications)
  { left: 75, top: 22 }, // 1: top-right (Links)
  { left: 75, top: 68 }, // 2: bottom-right (Assessment)
  { left: 25, top: 68 }, // 3: bottom-left (News)
];

/**
 * One continuous smooth curve — the glass travels between cards while
 * simultaneously doing small loops. No separate phases, no velocity
 * discontinuities. The base position eases between card centers while
 * a sinusoidal overlay adds one circular wobble per card.
 */
function buildScanPath(pendingIndices: number[]) {
  const tops: string[] = [];
  const lefts: string[] = [];
  const times: number[] = [];

  if (pendingIndices.length === 0) return { tops, lefts, times };

  const n = pendingIndices.length;
  const loopRadiusPx = 18;
  const totalSteps = n * 30;

  for (let s = 0; s <= totalSteps; s++) {
    const t = s / totalSteps;

    // Smoothly interpolate between card centers
    const cardProgress = t * n;
    const segIndex = Math.min(Math.floor(cardProgress), n - 1);
    const nextIndex = (segIndex + 1) % n;
    const frac = cardProgress - segIndex;

    const curr = CARD_CENTERS[pendingIndices[segIndex]!]!;
    const next = CARD_CENTERS[pendingIndices[nextIndex]!]!;

    // S-curve easing so the glass lingers near centers, moves fast between
    const easedFrac =
      frac < 0.5 ? 2 * frac * frac : 1 - 2 * (1 - frac) * (1 - frac);

    const baseLeft = curr.left + (next.left - curr.left) * easedFrac;
    const baseTop = curr.top + (next.top - curr.top) * easedFrac;

    // Continuous circular overlay — one full loop per card visit
    const loopAngle = t * n * Math.PI * 2;
    const dx = Math.round(loopRadiusPx * Math.sin(loopAngle));
    const dy = Math.round(-loopRadiusPx * Math.cos(loopAngle));

    tops.push(`calc(${baseTop.toFixed(2)}% + ${dy}px)`);
    lefts.push(`calc(${baseLeft.toFixed(2)}% + ${dx}px)`);
    times.push(t);
  }

  return { tops, lefts, times };
}

function ScanningGlass({
  onCardChange,
  pendingIndices,
}: {
  onCardChange: (index: number) => void;
  pendingIndices: number[];
}) {
  const { tops, lefts, times } = useMemo(
    () => buildScanPath(pendingIndices),
    [pendingIndices],
  );

  const lastCardRef = useRef(-1);

  if (tops.length === 0) return null;

  // Duration scales with number of pending cards
  const duration = pendingIndices.length === 1 ? 4 : pendingIndices.length * 3;

  return (
    <motion.div
      key={pendingIndices.join(',')} // remount when pending cards change to restart animation
      className="pointer-events-none absolute z-10 -translate-x-[18px] -translate-y-[18px]"
      animate={{ top: tops, left: lefts }}
      transition={{
        duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'linear', // easing is baked into the path via S-curve interpolation
        times,
      }}
      onUpdate={(latest) => {
        const extractPct = (v: unknown): number => {
          const s = String(v);
          const match = s.match(/([\d.]+)%/);
          return match ? Number.parseFloat(match[1]!) : Number.NaN;
        };
        const top = extractPct(latest.top);
        const left = extractPct(latest.left);
        if (Number.isNaN(top) || Number.isNaN(left)) return;
        const row = top < 50 ? 0 : 1;
        const col = left < 50 ? 0 : 1;
        const card = row * 2 + col;
        if (card !== lastCardRef.current) {
          lastCardRef.current = card;
          onCardChange(card);
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
        {/* Glow behind lens */}
        <circle cx="15" cy="15" r="14" className="fill-primary/10" />
        {/* Lens */}
        <circle
          cx="15"
          cy="15"
          r="10"
          className="stroke-primary"
          strokeWidth="2"
          fill="none"
        />
        {/* Inner highlight */}
        <circle cx="15" cy="15" r="6" className="fill-primary/[0.06]" />
        {/* Handle */}
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
}: {
  label: string;
  items: Finding[];
  isActive: boolean;
  color: 'success' | 'primary';
  highlighted: boolean;
}) {
  const done = items.length > 0;

  return (
    <motion.div
      layout
      className={`rounded-lg border p-4 transition-all duration-500 ${
        done
          ? 'border-border bg-card shadow-sm'
          : highlighted
            ? 'border-primary/30 bg-muted/40 shadow-md ring-1 ring-primary/10'
            : 'border-dashed border-border/60 bg-muted/30'
      }`}
    >
      {/* Header */}
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

      {/* Items */}
      {done ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <motion.span
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                color === 'success'
                  ? 'bg-success/[0.06] text-card-foreground'
                  : 'bg-primary/[0.06] text-card-foreground'
              }`}
            >
              {color === 'success' && (
                <Checkmark size={10} className="text-success shrink-0" />
              )}
              {color === 'primary' && (
                <span className="text-primary text-[10px] shrink-0">↗</span>
              )}
              <span className="truncate max-w-[200px]">{item.label}</span>
            </motion.span>
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

  // Which card indices are still pending (no findings yet)?
  // 0=Certifications, 1=Links, 2=Assessment, 3=News
  const pendingIndices = useMemo(() => {
    const indices: number[] = [];
    if (certs.length === 0) indices.push(0);
    if (links.length === 0) indices.push(1);
    if (assessments.length === 0) indices.push(2);
    if (news.length === 0) indices.push(3);
    return indices;
  }, [certs.length, links.length, assessments.length, news.length]);


  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
          )}
          <Text size="sm" weight="semibold">
            {isActive
              ? `Researching ${vendorName ?? 'vendor'} security posture`
              : 'Research complete'}
          </Text>
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
      <div className="px-5 pb-5 grid grid-cols-2 gap-3 relative">
        {isActive && pendingIndices.length > 0 && (
          <ScanningGlass
            onCardChange={handleCardChange}
            pendingIndices={pendingIndices}
          />
        )}
        <CategoryCard
          label="Certifications"
          items={certs}
          isActive={isActive}
          color="success"
          highlighted={activeCard === 0}
        />
        <CategoryCard
          label="Links"
          items={links}
          isActive={isActive}
          color="primary"
          highlighted={activeCard === 1}
        />
        <CategoryCard
          label="Security Assessment"
          items={assessments}
          isActive={isActive}
          color="success"
          highlighted={activeCard === 2}
        />
        <CategoryCard
          label="Recent News"
          items={news}
          isActive={isActive}
          color="success"
          highlighted={activeCard === 3}
        />
      </div>
    </div>
  );
}
