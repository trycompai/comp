'use client';

import { Image as ImageIcon } from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';

/** A run paired with the instruction it belongs to (runs don't carry that context). */
export interface RunSummary {
  run: BrowserAutomationRun;
  automationId: string;
  automationName: string;
}

interface RunHistoryStripProps {
  runs: RunSummary[];
  onSelect: (summary: RunSummary) => void;
}

const MAX_TILES = 6;

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Horizontal strip of recent run screenshots for a connection (design 1n). */
export function RunHistoryStrip({ runs, onSelect }: RunHistoryStripProps) {
  const [showAll, setShowAll] = useState(false);

  if (runs.length === 0) return null;

  const visible = showAll ? runs : runs.slice(0, MAX_TILES);

  return (
    <div>
      <div className="mb-2 flex items-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Run history · screenshots become evidence
        </span>
        {runs.length > MAX_TILES && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="ml-auto text-[11px] text-primary hover:underline"
          >
            {showAll ? 'Show fewer' : `View all ${runs.length} runs`}
          </button>
        )}
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {visible.map((summary) => (
          <RunTile key={summary.run.id} summary={summary} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function RunTile({
  summary,
  onSelect,
}: {
  summary: RunSummary;
  onSelect: (summary: RunSummary) => void;
}) {
  const { run } = summary;
  const [imageError, setImageError] = useState(false);

  const passed = run.evaluationStatus === 'pass';
  const failed =
    run.evaluationStatus === 'fail' || run.status === 'failed' || run.status === 'blocked';
  const showImage = !!run.screenshotUrl && !imageError;

  return (
    <button onClick={() => onSelect(summary)} className="w-[150px] shrink-0 text-left">
      <div className="relative grid h-[92px] place-items-center overflow-hidden rounded-md border border-border bg-muted">
        {showImage ? (
          <Image
            src={run.screenshotUrl!}
            alt={`${summary.automationName} screenshot`}
            width={150}
            height={92}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <ImageIcon size={20} className="text-muted-foreground" />
        )}
        {passed && (
          <span
            className="absolute right-1.5 top-1.5 rounded-sm px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em]"
            style={{
              background: 'color-mix(in oklab, var(--success) 15%, transparent)',
              color: 'var(--success)',
            }}
          >
            Pass
          </span>
        )}
        {!passed && failed && (
          <span
            className="absolute right-1.5 top-1.5 rounded-sm px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em]"
            style={{
              background: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
              color: 'var(--destructive)',
            }}
          >
            Fail
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>{formatDay(run.createdAt)}</span>
        <span className="font-mono">{formatTime(run.createdAt)}</span>
      </div>
    </button>
  );
}
