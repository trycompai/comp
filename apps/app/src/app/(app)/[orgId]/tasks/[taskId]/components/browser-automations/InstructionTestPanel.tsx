'use client';

import { Checkmark, Close, Locked, Play } from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { InstructionTestResult } from '../../hooks/types';
import { LiveActivityBorder } from './LiveActivityBorder';
import { StepList, type SignInStep } from './StepList';

export type TestPhase = 'idle' | 'testing' | 'result';

interface InstructionTestPanelProps {
  phase: TestPhase;
  host: string;
  liveViewUrl?: string | null;
  steps: SignInStep[];
  result?: InstructionTestResult | null;
}

function verdict(result: InstructionTestResult): { label: string; bg: string; fg: string } {
  if (result.success && result.evaluationStatus === 'pass') {
    return {
      label: 'Passed',
      bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
      fg: 'var(--success)',
    };
  }
  if (result.success && result.evaluationStatus === 'fail') {
    return {
      label: 'Check failed',
      bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
      fg: 'var(--destructive)',
    };
  }
  if (result.success) {
    return {
      label: 'Captured',
      bg: 'color-mix(in oklab, var(--primary) 12%, transparent)',
      fg: 'var(--primary)',
    };
  }
  if (result.needsReauth || result.blockedReason) {
    return {
      label: 'Needs reconnect',
      bg: 'color-mix(in oklab, var(--warning) 22%, transparent)',
      fg: 'oklch(0.5 0.14 85)',
    };
  }
  return {
    label: 'Failed',
    bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
    fg: 'var(--destructive)',
  };
}

function TestRunHeader({ children }: { children: React.ReactNode }) {
  // Fixed height so this header lines up with the composer's field label on the
  // left, keeping the browser view and the first input on the same baseline.
  return (
    <div className="flex h-6 items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Test run
      </span>
      {children}
    </div>
  );
}

/** Right pane of the composer: watch the AI live, then see the result (design 1i). */
export function InstructionTestPanel({
  phase,
  host,
  liveViewUrl,
  steps,
  result,
}: InstructionTestPanelProps) {
  // Gate the ring on the iframe's load so it appears with the page, not before.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [liveViewUrl]);

  if (phase === 'idle') {
    return (
      <div className="grid flex-1 place-items-center rounded-md border border-dashed border-border">
        <div className="max-w-[280px] text-center">
          <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-full border border-border bg-background">
            <Play size={14} className="text-muted-foreground" />
          </div>
          <div className="mb-1 text-sm text-foreground">Test to watch the AI live</div>
          <div className="text-[11.5px] leading-relaxed text-muted-foreground">
            You&apos;ll see every step here. Refine the instruction until it works, then save.
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'testing') {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <TestRunHeader>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{
              background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
              color: 'var(--primary)',
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            AI running
          </span>
        </TestRunHeader>

        <div className="relative overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-8 items-center gap-2 border-b border-border px-3">
            <Locked size={11} className="text-muted-foreground" />
            <span className="truncate font-mono text-[10.5px] text-muted-foreground">{host}</span>
          </div>
          {/* Wrap only the browser view so the ring hugs the page, not our
              chrome bar; show it once the iframe has rendered. */}
          <div className="relative">
            {liveViewUrl ? (
              <iframe
                src={liveViewUrl}
                title="Test run live view"
                // 16:9 matches the 1920x1080 capture, so the view fills the width
                // without side gaps and stays crisp (downscaled, not upscaled).
                className="block aspect-video max-h-[70vh] w-full"
                sandbox="allow-same-origin allow-scripts"
                onLoad={() => setLoaded(true)}
              />
            ) : (
              <div className="grid aspect-video max-h-[70vh] w-full place-items-center text-xs text-muted-foreground">
                Starting the browser…
              </div>
            )}
            {loaded && <LiveActivityBorder state="ai" />}
          </div>
        </div>

        {steps.length > 0 && (
          <div className="rounded-md border border-border bg-background px-3.5 py-2.5">
            <StepList steps={steps} />
          </div>
        )}
      </div>
    );
  }

  // result
  if (!result) return null;
  const badge = verdict(result);
  const hasEvaluation =
    result.evaluationStatus === 'pass' || result.evaluationStatus === 'fail';
  const errorText = result.blockedReason || result.error;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <TestRunHeader>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
      </TestRunHeader>

      {result.focusScreenshotUrl && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Evidence — close-up
          </span>
          <div className="overflow-hidden rounded-md border border-border bg-white">
            <Image
              src={result.focusScreenshotUrl}
              alt="Evidence close-up"
              width={800}
              height={450}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      )}

      {result.screenshotUrl && (
        <div className="flex flex-col gap-1">
          {result.focusScreenshotUrl && (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Full page
            </span>
          )}
          <div className="overflow-hidden rounded-md border border-border bg-white">
            <Image
              src={result.screenshotUrl}
              alt="Full page capture"
              width={800}
              height={450}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      )}

      {hasEvaluation && (
        <div className="rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="grid h-4 w-4 place-items-center rounded-full text-white"
              style={{
                background:
                  result.evaluationStatus === 'pass'
                    ? 'var(--success)'
                    : 'var(--destructive)',
              }}
            >
              {result.evaluationStatus === 'pass' ? <Checkmark size={9} /> : <Close size={8} />}
            </span>
            {result.evaluationStatus === 'pass' ? 'Check passed' : 'Check failed'}
          </div>
          {result.evaluationReason && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              {result.evaluationReason}
            </p>
          )}
        </div>
      )}

      {!result.success && errorText && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
          {result.failureCode && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-destructive">
              {result.failureCode.replaceAll('_', ' ')}
            </p>
          )}
          <p className="text-[11.5px] leading-relaxed text-destructive">{errorText}</p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="rounded-md border border-border bg-background px-3.5 py-2.5">
          <StepList steps={steps} />
        </div>
      )}
    </div>
  );
}
