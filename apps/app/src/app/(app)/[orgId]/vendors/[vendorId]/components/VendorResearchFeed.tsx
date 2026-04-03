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

/** Stable positions for radar blips */
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

function RadarVisualization({ blipCount }: { blipCount: number }) {
  return (
    <div className="relative flex-shrink-0 w-[160px] h-[160px] flex items-center justify-center">
      {/* Circles */}
      <div className="absolute w-[160px] h-[160px] rounded-full border border-primary/10" />
      <div className="absolute w-[115px] h-[115px] rounded-full border border-primary/[0.08]" />
      <div className="absolute w-[70px] h-[70px] rounded-full border border-primary/[0.06]" />
      <div className="absolute w-[28px] h-[28px] rounded-full bg-primary/10" />

      {/* Crosshairs */}
      <div className="absolute w-full h-px bg-primary/[0.05]" />
      <div className="absolute w-px h-full bg-primary/[0.05]" />

      {/* Sweep */}
      <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
        <div
          className="absolute left-1/2 bottom-1/2 w-[2px] h-[80px] -ml-px origin-bottom"
          style={{
            background:
              'linear-gradient(to top, hsl(var(--color-primary) / 0.6), transparent)',
          }}
        />
      </div>

      {/* Blips */}
      <AnimatePresence>
        {Array.from({ length: Math.min(blipCount, BLIP_POSITIONS.length) }).map(
          (_, i) => (
            <motion.div
              key={`blip-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute w-[7px] h-[7px] rounded-full bg-success animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                ...BLIP_POSITIONS[i],
                boxShadow: '0 0 8px hsl(var(--color-success) / 0.5)',
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
  const hasFIndings = items.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {hasFIndings ? (
          <Checkmark size={12} className="text-success" />
        ) : isActive ? (
          <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
        ) : (
          <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/20" />
        )}
        <span
          className={`text-[11px] uppercase tracking-wider ${
            hasFIndings ? 'text-muted-foreground' : 'text-muted-foreground/50'
          }`}
        >
          {label}
        </span>
        {hasFIndings && (
          <span className="text-[11px] text-muted-foreground/50">
            ({items.length})
          </span>
        )}
      </div>
      {hasFIndings && (
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

  const certs = findings.filter((f) => f.kind === 'cert');
  const links = findings.filter((f) => f.kind === 'link');
  const other = findings.filter(
    (f) => f.kind === 'assessment' || f.kind === 'news',
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-gradient-to-b from-card to-card/80 shadow-lg">
      {/* Shimmer bar */}
      {isActive && (
        <div
          className="h-[2px] animate-[shimmer-bar_3s_ease-in-out_infinite]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--color-primary) / 0.5) 30%, hsl(var(--color-success) / 0.5) 70%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
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
        {findings.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
          </span>
        )}
      </div>

      {/* Radar + Findings */}
      <div className="flex gap-6 px-5 py-4">
        <RadarVisualization blipCount={findings.length} />

        <div className="flex-1 min-w-0">
          {/* Scanning checklist — always visible, items transition from pending to done */}
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

      {/* Bottom spacer */}
      <div className="h-1" />
    </div>
  );
}
