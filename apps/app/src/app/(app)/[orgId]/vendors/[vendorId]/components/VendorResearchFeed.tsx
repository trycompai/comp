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
function ScanningGlass({
  onCardChange,
}: {
  onCardChange: (index: number) => void;
}) {
  // Card centers
  const cards = [
    { left: 25, top: 22 }, // top-left
    { left: 75, top: 22 }, // top-right
    { left: 75, top: 68 }, // bottom-right
    { left: 25, top: 68 }, // bottom-left
  ];
  // The grid container is ~2x wider than tall, so equal % values
  // produce an oval. Use a smaller horizontal % to compensate.
  const rx = 1.8; // horizontal radius (less % because container is wide)
  const ry = 3.5; // vertical radius

  // Build keyframes: for each card → arrive, circle (4 points), then travel to next
  const tops: string[] = [];
  const lefts: string[] = [];
  const times: number[] = [];

  const travelTime = 0.08; // fraction of total for each card-to-card move
  const circleTime = 0.17; // fraction of total for the circle at each card
  // 4 cards × (circle + travel) = 4 × 0.25 = 1.0
  let t = 0;

  for (let i = 0; i < 4; i++) {
    const c = cards[i]!;
    // Arrive at center
    tops.push(`${c.top}%`);
    lefts.push(`${c.left}%`);
    times.push(t);
    // Circle: 8 points around the center for a smooth curve
    // Linear interpolation between 4 cardinal points makes a diamond/cross.
    // 8 points (every 45°) approximates a circle much better.
    const steps = 16;
    for (let s = 1; s <= steps; s++) {
      const angle = (s / steps) * Math.PI * 2;
      tops.push(`${c.top - ry * Math.cos(angle)}%`);
      lefts.push(`${c.left + rx * Math.sin(angle)}%`);
      times.push(t + circleTime * (s / steps));
    }
    t += circleTime + travelTime;
  }
  // Return to first card for seamless loop
  tops.push(`${cards[0]!.top}%`);
  lefts.push(`${cards[0]!.left}%`);
  times.push(1);

  const lastCardRef = useRef(-1);

  return (
    <motion.div
      className="pointer-events-none absolute z-10 -translate-x-[18px] -translate-y-[18px]"
      animate={{ top: tops, left: lefts }}
      transition={{
        duration: 10,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'linear',
        times,
      }}
      onUpdate={(latest) => {
        // Derive which card the glass is over from its actual position
        const top = Number.parseFloat(String(latest.top));
        const left = Number.parseFloat(String(latest.left));
        const row = top < 50 ? 0 : 1;
        const col = left < 50 ? 0 : 1;
        const card = row * 2 + col; // 0=TL, 1=TR, 2=BL, 3=BR
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
        {isActive && <ScanningGlass onCardChange={handleCardChange} />}
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
