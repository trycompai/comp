'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { ChevronDown, Image as ImageIcon } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunStepLedger } from './RunStepLedger';

interface RunItemProps {
  run: BrowserAutomationRun;
  isLatest: boolean;
}

function verdict(run: BrowserAutomationRun): { label: string; bg: string; fg: string } {
  if (run.status === 'blocked') {
    return {
      label: 'Blocked',
      bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
      fg: 'oklch(0.5 0.14 85)',
    };
  }
  if (run.status === 'failed' || run.evaluationStatus === 'fail') {
    return {
      label: run.evaluationStatus === 'fail' ? 'Fail' : 'Failed',
      bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
      fg: 'var(--destructive)',
    };
  }
  if (run.evaluationStatus === 'pass') {
    return {
      label: 'Pass',
      bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
      fg: 'var(--success)',
    };
  }
  return { label: 'Completed', bg: 'var(--muted)', fg: 'var(--foreground)' };
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Distinct vendor hosts a run touched, in step order. */
function vendorChain(run: BrowserAutomationRun): string[] {
  const hosts: string[] = [];
  for (const sr of run.stepRuns ?? []) {
    const host = sr.step?.targetUrl ? hostLabel(sr.step.targetUrl) : null;
    if (host && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

function screenshotCount(run: BrowserAutomationRun): number {
  const steps = run.stepRuns ?? [];
  if (steps.length > 0) {
    return steps.reduce(
      (n, s) => n + (s.screenshotUrl ? 1 : 0) + (s.focusScreenshotUrl ? 1 : 0),
      0,
    );
  }
  return (run.screenshotUrl ? 1 : 0) + (run.focusScreenshotUrl ? 1 : 0);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(run: BrowserAutomationRun): string | null {
  if (!run.completedAt) return null;
  const ms = new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

/**
 * One run as a text ledger row (designer option 1A): date · vendor chain ·
 * verdict · screenshot count · duration. Expanding drops into the per-step
 * ledger — imagery lives there, not in this row.
 */
export function RunItem({ run, isLatest }: RunItemProps) {
  const [expanded, setExpanded] = useState(isLatest);
  const badge = verdict(run);
  const chain = vendorChain(run);
  const stepCount = run.stepRuns?.length ?? 0;
  const shots = screenshotCount(run);
  const duration = formatDuration(run);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
      >
        <span className="w-28 flex-none font-mono text-[11px] text-muted-foreground">
          {formatDateTime(run.createdAt)}
        </span>
        {chain.length > 0 && (
          <span className="flex flex-none items-center gap-1">
            {chain.map((host, i) => (
              <span key={`${host}-${i}`} className="flex items-center gap-1" title={host}>
                {i > 0 && <span className="text-[10px] text-muted-foreground/50">→</span>}
                <VendorLogo hostname={host} size={16} />
              </span>
            ))}
          </span>
        )}
        <span
          className="flex-none rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ backgroundColor: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <ImageIcon size={11} className={shots === 0 ? 'opacity-50' : undefined} />
            {stepCount > 1 ? `${stepCount} steps · ` : ''}
            {shots} {shots === 1 ? 'screenshot' : 'screenshots'}
          </span>
        </span>
        {duration && (
          <span className="flex-none font-mono text-[10px] text-muted-foreground">
            {duration}
          </span>
        )}
        <ChevronDown
          size={12}
          className={`flex-none text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expanded && (
        <div className="bg-muted/20 px-3 pb-3 pt-1">
          <RunStepLedger run={run} />
        </div>
      )}
    </div>
  );
}
