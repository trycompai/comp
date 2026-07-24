'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { ChevronDown, Image as ImageIcon } from '@trycompai/design-system/icons';
import NextImage from 'next/image';
import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';

/** A run's steps, normalized for the ledger (real per-step runs, or the run itself). */
interface LedgerStep {
  key: string;
  index: number;
  host: string | null;
  status: string;
  evaluationStatus?: 'pass' | 'fail' | null;
  reason?: string | null;
  screenshotUrl?: string | null;
  focusScreenshotUrl?: string | null;
}

function hostLabel(targetUrl: string): string {
  try {
    return new URL(targetUrl).hostname.replace(/^www\./, '');
  } catch {
    return targetUrl;
  }
}

function verdict(step: { status: string; evaluationStatus?: 'pass' | 'fail' | null }): {
  label: string;
  bg: string;
  fg: string;
} {
  if (step.status === 'blocked') {
    return {
      label: 'Blocked',
      bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
      fg: 'oklch(0.5 0.14 85)',
    };
  }
  if (step.status === 'failed' || step.evaluationStatus === 'fail') {
    return {
      label: step.evaluationStatus === 'fail' ? 'Fail' : 'Failed',
      bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
      fg: 'var(--destructive)',
    };
  }
  if (step.evaluationStatus === 'pass') {
    return {
      label: 'Pass',
      bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
      fg: 'var(--success)',
    };
  }
  return { label: 'Completed', bg: 'var(--muted)', fg: 'var(--foreground)' };
}

/** Steps for the ledger: the per-step runs, or the run itself as a single step. */
function toLedgerSteps(run: BrowserAutomationRun): LedgerStep[] {
  const stepRuns = run.stepRuns ?? [];
  if (stepRuns.length > 0) {
    return stepRuns.map((sr, index) => ({
      key: sr.id,
      index,
      host: sr.step?.targetUrl ? hostLabel(sr.step.targetUrl) : null,
      status: sr.status,
      evaluationStatus: sr.evaluationStatus,
      reason: sr.evaluationReason ?? sr.error,
      screenshotUrl: sr.screenshotUrl,
      focusScreenshotUrl: sr.focusScreenshotUrl,
    }));
  }
  return [
    {
      key: run.id,
      index: 0,
      host: null,
      status: run.status,
      evaluationStatus: run.evaluationStatus,
      reason: run.evaluationReason ?? run.blockedReason ?? run.error,
      screenshotUrl: run.screenshotUrl,
      focusScreenshotUrl: run.focusScreenshotUrl,
    },
  ];
}

function shotCount(step: LedgerStep): number {
  return (step.screenshotUrl ? 1 : 0) + (step.focusScreenshotUrl ? 1 : 0);
}

/** A labelled screenshot pane (close-up = proof, full page = context, scrolls). */
function ShotPane({ label, src, scroll }: { label: string; src: string; scroll?: boolean }) {
  const [error, setError] = useState(false);
  // Both panes share one fixed height so they align: the close-up is contained
  // and centered; the full page scrolls inside the box.
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      {!error ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={`block h-64 rounded-md border border-border bg-white ${
            scroll ? 'overflow-y-auto' : 'grid place-items-center overflow-hidden'
          }`}
        >
          <NextImage
            src={src}
            alt={label}
            width={800}
            height={450}
            className={
              scroll
                ? 'h-auto w-full object-contain'
                : 'max-h-full w-auto max-w-full object-contain'
            }
            onError={() => setError(true)}
          />
        </a>
      ) : (
        <div className="grid h-64 place-items-center rounded-md border border-border bg-white text-xs text-muted-foreground">
          Screenshot unavailable
        </div>
      )}
    </div>
  );
}

/** One ledger row: collapsed = verdict + reason + count; expand = proof + context.
 *  In `flat` mode the header isn't clickable and the screenshots are always shown. */
function StepRow({
  step,
  defaultExpanded,
  flat,
}: {
  step: LedgerStep;
  defaultExpanded: boolean;
  flat?: boolean;
}) {
  const count = shotCount(step);
  const [open, setOpen] = useState(defaultExpanded && count > 0);
  const expanded = flat ? count > 0 : open;
  const badge = verdict(step);
  const failed = step.status === 'failed' || step.status === 'blocked';
  // Close-up is the proof; fall back to the full page when no close-up exists.
  const proof = step.focusScreenshotUrl || step.screenshotUrl;
  const full = step.screenshotUrl;

  const header = (
    <>
      <span className="grid h-5 w-5 flex-none place-items-center rounded-sm bg-muted font-mono text-[10px] text-foreground">
        {step.index + 1}
      </span>
      {step.host && <VendorLogo hostname={step.host} size={18} />}
      {step.host && (
        <span className="hidden flex-none font-mono text-[11px] text-muted-foreground sm:inline">
          {step.host}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-[11.5px] ${
          failed ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        {step.reason || (failed ? 'No screenshot captured' : 'Evidence captured')}
      </span>
      <span
        className="flex-none rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
        style={{ backgroundColor: badge.bg, color: badge.fg }}
      >
        {badge.label}
      </span>
      <span className="hidden flex-none items-center gap-1 whitespace-nowrap text-[10.5px] text-muted-foreground sm:inline-flex">
        <ImageIcon size={11} className={count === 0 ? 'opacity-50' : undefined} />
        {count} {count === 1 ? 'screenshot' : 'screenshots'}
      </span>
      {!flat && count > 0 && (
        <ChevronDown
          size={12}
          className={`flex-none text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      )}
    </>
  );

  return (
    <div className="border-b border-border last:border-b-0">
      {flat ? (
        <div className="flex w-full items-center gap-2.5 px-3 py-2.5">{header}</div>
      ) : (
        <button
          type="button"
          onClick={() => count > 0 && setOpen((v) => !v)}
          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left ${
            count > 0 ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'
          }`}
        >
          {header}
        </button>
      )}

      {expanded && count > 0 && (
        <div className="flex flex-col gap-3 bg-muted/30 px-3 pb-3 pt-1 sm:flex-row">
          {proof && <ShotPane label="Close-up · Proof" src={proof} />}
          {full && full !== proof && (
            <ShotPane label="Full page · Context — scrolls" src={full} scroll />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Run detail as a text-only step ledger (designer option C3): each step is a
 * collapsed row (verdict + reason + screenshot count); expanding shows the
 * close-up "proof" beside the scrollable full page. Single-step runs auto-expand.
 */
export function RunStepLedger({
  run,
  flat,
}: {
  run: BrowserAutomationRun;
  /** Show every step expanded with its screenshots inline (no per-step click). */
  flat?: boolean;
}) {
  const steps = toLedgerSteps(run);
  const single = steps.length === 1;
  return (
    // Flat mode sits inside the history card, so it drops its own border.
    <div className={flat ? undefined : 'overflow-hidden rounded-md border border-border'}>
      {steps.map((step) => (
        <StepRow key={step.key} step={step} defaultExpanded={single} flat={flat} />
      ))}
    </div>
  );
}
