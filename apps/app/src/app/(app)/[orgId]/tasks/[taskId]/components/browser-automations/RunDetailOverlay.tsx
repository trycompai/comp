'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import {
  Download,
  Image as ImageIcon,
  Launch as ExternalLink,
  Play,
} from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useState } from 'react';
import type { BrowserAutomationRun, BrowserAutomationStepRun } from '../../hooks/types';
import type { RunSummary } from './RunHistoryStrip';

interface RunDetailOverlayProps {
  selected: RunSummary | null;
  onClose: () => void;
  onRerun?: (automationId: string) => void;
}

function verdict(run: {
  status?: string | null;
  evaluationStatus?: 'pass' | 'fail' | null;
}): { label: string; bg: string; fg: string } {
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Vendor host used to label a step, e.g. "https://github.com/…" → "github.com". */
function hostLabel(targetUrl: string): string {
  try {
    return new URL(targetUrl).hostname.replace(/^www\./, '');
  } catch {
    return targetUrl;
  }
}

/** One step's evidence in a multi-step run: a labelled screenshot + verdict. */
function StepEvidence({ step, index }: { step: BrowserAutomationStepRun; index: number }) {
  const [imageError, setImageError] = useState(false);
  const badge = verdict(step);
  const host = step.step?.targetUrl ? hostLabel(step.step.targetUrl) : null;
  const showImage = !!step.screenshotUrl && !imageError;
  const note = step.error || step.evaluationReason;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          Step {index + 1}
          {host ? ` · ${host}` : ''}
        </span>
        <span
          className="flex-none rounded-sm px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
          style={{ backgroundColor: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
      </div>
      {showImage ? (
        <a
          href={step.screenshotUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-muted/30"
        >
          <Image
            src={step.screenshotUrl!}
            alt={`Step ${index + 1} screenshot`}
            width={800}
            height={450}
            className="h-auto w-full object-contain"
            onError={() => setImageError(true)}
          />
        </a>
      ) : (
        <div className="grid min-h-[120px] place-items-center px-4 py-6 text-center">
          <div>
            <ImageIcon size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {note || 'No screenshot captured for this step'}
            </p>
          </div>
        </div>
      )}
      {showImage && note && (
        <div className="border-t border-border px-3 py-2">
          <p
            className={`text-xs leading-relaxed ${step.error ? 'text-destructive' : 'text-foreground'}`}
          >
            {note}
          </p>
        </div>
      )}
    </div>
  );
}

/** Full-screen detail for a single run: screenshot + evidence metadata (design 1n). */
export function RunDetailOverlay({ selected, onClose, onRerun }: RunDetailOverlayProps) {
  return (
    <Dialog open={!!selected} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="3xl">
        {selected && (
          <RunDetailBody
            key={selected.run.id}
            summary={selected}
            onClose={onClose}
            onRerun={onRerun}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RunDetailBody({
  summary,
  onClose,
  onRerun,
}: {
  summary: RunSummary;
  onClose: () => void;
  onRerun?: (automationId: string) => void;
}) {
  const { run, automationId, automationName } = summary;
  const [imageError, setImageError] = useState(false);

  const badge = verdict(run);
  const steps = run.stepRuns ?? [];
  const isMultiStep = steps.length > 1;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
  const fullSizeHref = `${apiBase}/v1/browserbase/runs/${run.id}/screenshot`;
  const downloadHref = `${fullSizeHref}?download=true`;
  const showImage = !!run.screenshotUrl && !imageError;
  const errorText = run.blockedReason || run.error;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-2.5">
            <span className="min-w-0 flex-1 truncate">
              {automationName} · {formatDateTime(run.createdAt)}
            </span>
            <span
              className="rounded-sm px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
              style={{ backgroundColor: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          </span>
        </DialogTitle>
      </DialogHeader>

      {isMultiStep ? (
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto py-2">
          {steps.map((step, index) => (
            <StepEvidence key={step.id} step={step} index={index} />
          ))}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            <span>Started {formatDateTime(run.createdAt)}</span>
            {run.completedAt && <span>Finished {formatDateTime(run.completedAt)}</span>}
            {onRerun && (
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Play size={12} />}
                  onClick={() => {
                    onRerun(automationId);
                    onClose();
                  }}
                >
                  Re-run now
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 py-2 md:flex-row">
        {/* Screenshot */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-md border border-border bg-muted/30">
            {showImage ? (
              <Image
                src={run.screenshotUrl!}
                alt={`${automationName} screenshot`}
                width={800}
                height={450}
                className="h-auto w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="grid h-[220px] place-items-center text-center">
                <div>
                  <ImageIcon size={32} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No screenshot captured</p>
                </div>
              </div>
            )}
          </div>
          {run.screenshotUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={fullSizeHref} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" iconLeft={<ExternalLink size={12} />}>
                  Open full size
                </Button>
              </a>
              <a href={downloadHref} rel="noopener noreferrer">
                <Button variant="outline" size="sm" iconLeft={<Download size={12} />}>
                  Download
                </Button>
              </a>
              {onRerun && (
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Play size={12} />}
                    onClick={() => {
                      onRerun(automationId);
                      onClose();
                    }}
                  >
                    Re-run now
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex w-full flex-col gap-4 md:w-64 md:flex-none md:border-l md:border-border md:pl-5">
          {(run.evaluationStatus === 'pass' || run.evaluationStatus === 'fail') &&
            run.evaluationReason && (
              <div>
                <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Check
                </div>
                <p className="text-xs leading-relaxed text-foreground">{run.evaluationReason}</p>
              </div>
            )}

          {errorText && (
            <div>
              {run.failureCode && (
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-destructive">
                  {run.failureCode.replaceAll('_', ' ')}
                </div>
              )}
              <p className="text-xs leading-relaxed text-destructive">{errorText}</p>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            <span>Started {formatDateTime(run.createdAt)}</span>
            {run.completedAt && <span>Finished {formatDateTime(run.completedAt)}</span>}
            {typeof run.attemptCount === 'number' && (
              <span>Attempt {run.attemptCount} of 1</span>
            )}
            <span>Auto re-login used · unattended</span>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
