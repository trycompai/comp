'use client';

import { Text } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';

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

const BLIP_POSITIONS: Array<Record<string, string>> = [
  { top: '18%', right: '22%' },
  { bottom: '28%', left: '18%' },
  { top: '42%', left: '15%' },
  { bottom: '20%', right: '28%' },
  { top: '22%', left: '30%' },
  { bottom: '35%', right: '15%' },
  { top: '30%', right: '15%' },
  { bottom: '15%', left: '30%' },
  { top: '15%', left: '45%' },
  { bottom: '42%', right: '20%' },
  { top: '35%', right: '35%' },
  { bottom: '25%', left: '40%' },
  { top: '50%', left: '12%' },
  { bottom: '12%', right: '40%' },
  { top: '25%', right: '12%' },
];

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

function RadarVisualization({
  blipCount,
  size,
}: {
  blipCount: number;
  size: number;
}) {
  const half = size / 2;
  const r1 = size * 0.72;
  const r2 = size * 0.44;
  const r3 = size * 0.18;

  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Circles */}
      <div
        className="absolute rounded-full border border-primary/15"
        style={{ width: size, height: size }}
      />
      <div
        className="absolute rounded-full border border-primary/12"
        style={{ width: r1, height: r1 }}
      />
      <div
        className="absolute rounded-full border border-primary/10"
        style={{ width: r2, height: r2 }}
      />
      <div
        className="absolute rounded-full bg-primary/10"
        style={{ width: r3, height: r3 }}
      />

      {/* Crosshairs */}
      <div className="absolute w-full h-px bg-primary/[0.07]" />
      <div className="absolute w-px h-full bg-primary/[0.07]" />

      {/* Sonar sweep — SVG for pixel-perfect alignment */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: '2.5s' }}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="sweep-line" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" className="[stop-color:theme(colors.primary)]" stopOpacity="1" />
            <stop offset="60%" className="[stop-color:theme(colors.primary)]" stopOpacity="0.5" />
            <stop offset="100%" className="[stop-color:theme(colors.primary)]" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Sweep line from center to top */}
        <line
          x1={half}
          y1={half}
          x2={half}
          y2={2}
          stroke="url(#sweep-line)"
          strokeWidth="1"
        />
        {/* Trail cone — narrow and subtle */}
        <path
          d={`M ${half} ${half} L ${half + half * 0.18} ${2} L ${half} ${2} Z`}
          className="fill-primary/[0.06]"
        />
      </svg>

      {/* Blips */}
      <AnimatePresence>
        {Array.from({ length: Math.min(blipCount, BLIP_POSITIONS.length) }).map(
          (_, i) => (
            <motion.div
              key={`blip-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute w-[7px] h-[7px] rounded-full bg-success animate-pulse shadow-[0_0_8px_theme(colors.success)]"
              style={{
                ...BLIP_POSITIONS[i],
                animationDelay: `${i * 300}ms`,
              }}
            />
          ),
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanCategory({
  label,
  items,
  startIndex,
  isActive,
}: {
  label: string;
  items: Finding[];
  startIndex: number;
  isActive: boolean;
}) {
  const hasFindings = items.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {hasFindings ? (
          <Checkmark size={12} className="text-success" />
        ) : isActive ? (
          <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
        ) : (
          <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/20" />
        )}
        <span
          className={`text-[11px] uppercase tracking-wider ${
            hasFindings ? 'text-muted-foreground' : 'text-muted-foreground/50'
          }`}
        >
          {label}
        </span>
        {hasFindings && (
          <span className="text-[11px] text-muted-foreground/50">
            ({items.length})
          </span>
        )}
      </div>
      {hasFindings && (
        <div className="flex flex-wrap gap-2 ml-5">
          {items.map((f, i) => (
            <FindingBadge key={f.id} finding={f} index={startIndex + i} />
          ))}
        </div>
      )}
    </div>
  );
}

function FindingBadge({ finding, index }: { finding: Finding; index: number }) {
  const isCert = finding.kind === 'cert' || finding.kind === 'assessment';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] ${
        isCert
          ? 'border-success/15 bg-success/[0.06]'
          : 'border-primary/15 bg-primary/[0.06]'
      }`}
    >
      {isCert && <Checkmark size={12} className="text-success shrink-0" />}
      {!isCert && <span className="text-primary text-xs shrink-0">↗</span>}
      <span className="text-card-foreground truncate">{finding.label}</span>
    </motion.div>
  );
}

export function VendorResearchFeed({
  messages,
  isActive,
  vendorName,
}: VendorResearchFeedProps) {
  const findings = useMemo(() => parseFindings(messages), [messages]);
  const hasFindings = findings.length > 0;

  const certs = findings.filter((f) => f.kind === 'cert');
  const links = findings.filter((f) => f.kind === 'link');
  const other = findings.filter(
    (f) => f.kind === 'assessment' || f.kind === 'news',
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-gradient-to-b from-card to-card/80 shadow-lg">
      {/* Shimmer bar */}
      {isActive && (
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[shimmer-bar_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
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
        {hasFindings && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
          </span>
        )}
      </div>

      {/* Empty state: centered large radar + checklist below */}
      {!hasFindings && (
        <div className="flex flex-col items-center px-5 py-6 gap-6">
          <RadarVisualization blipCount={0} size={200} />
          <div className="flex gap-8">
            <ScanCategory label="Certifications" items={[]} startIndex={0} isActive={isActive} />
            <ScanCategory label="Links" items={[]} startIndex={0} isActive={isActive} />
            <ScanCategory label="Assessment" items={[]} startIndex={0} isActive={isActive} />
            <ScanCategory label="News" items={[]} startIndex={0} isActive={isActive} />
          </div>
        </div>
      )}

      {/* With findings: side-by-side radar + badges */}
      {hasFindings && (
        <div className="flex gap-6 px-5 py-4">
          <RadarVisualization blipCount={findings.length} size={160} />

          <div className="flex-1 min-w-0">
            <div className="space-y-3">
              <ScanCategory
                label="Certifications"
                items={certs}
                startIndex={0}
                isActive={isActive}
              />
              <ScanCategory
                label="Security & Legal Links"
                items={links}
                startIndex={certs.length}
                isActive={isActive}
              />
              <ScanCategory
                label="Security Assessment"
                items={other.filter((f) => f.kind === 'assessment')}
                startIndex={certs.length + links.length}
                isActive={isActive}
              />
              <ScanCategory
                label="Recent News"
                items={other.filter((f) => f.kind === 'news')}
                startIndex={certs.length + links.length + 1}
                isActive={isActive}
              />
            </div>
          </div>
        </div>
      )}

      <div className="h-1" />
    </div>
  );
}
