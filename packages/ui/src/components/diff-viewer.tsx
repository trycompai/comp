'use client';

import { cn } from '../utils';
import { parseDiff, type Hunk, type Line, type ParseOptions } from './diff/utils';

export function DiffViewer({
  patch,
  options = {},
}: {
  patch: string;
  options?: Partial<ParseOptions>;
}) {
  const [file] = parseDiff(patch, options);
  if (!file) return null;

  const hasChanges = file.hunks.some(
    (hunk) =>
      hunk.type === 'hunk' && hunk.lines.some((line) => line.type !== 'normal' && hasContent(line)),
  );
  if (!hasChanges) return null;

  return (
    <div className="rounded-sm border bg-card overflow-hidden">
      <DiffHeader />
      <div className="divide-y divide-border/50">
        {file.hunks.map((hunk, i) =>
          hunk.type === 'hunk' ? (
            <DiffHunk key={i} hunk={hunk} />
          ) : (
            <SkippedSection key={i} count={hunk.count} />
          ),
        )}
      </div>
    </div>
  );
}

function hasContent(line: Line): boolean {
  const text = line.content
    .map((seg) => seg.value)
    .join('')
    .trim();
  return text.length > 0;
}

function DiffHeader() {
  return (
    <div className="border-b bg-muted/50 px-4 py-3 space-y-2">
      <p className="text-sm/6 font-medium">Proposed Policy Updates</p>
      <div className="flex flex-wrap gap-4 text-xs/5 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <AddBadge />
          Text will be added
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RemoveBadge />
          Text will be removed
        </span>
      </div>
    </div>
  );
}

function AddBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px]/4 font-medium">
      + Add
    </span>
  );
}

function RemoveBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px]/4 font-medium">
      − Remove
    </span>
  );
}

function DiffHunk({ hunk }: { hunk: Hunk }) {
  const visibleLines = hunk.lines.filter((line) => line.type === 'normal' || hasContent(line));

  return (
    <div className="text-sm/6">
      {visibleLines.map((line, i) => (
        <DiffLine key={i} line={line} />
      ))}
    </div>
  );
}

function DiffLine({ line }: { line: Line }) {
  const text = line.content.map((seg) => seg.value).join('');

  if (line.type === 'normal') {
    return <div className="px-4 py-1 text-muted-foreground">{text}</div>;
  }

  const isAdd = line.type === 'insert';

  return (
    <div className={cn('flex items-center gap-3 px-4 py-1.5', isAdd ? 'bg-green-50' : 'bg-red-50')}>
      <span className="shrink-0">{isAdd ? <AddBadge /> : <RemoveBadge />}</span>
      <span className={cn(!isAdd && 'line-through decoration-red-500')}>{text}</span>
    </div>
  );
}

function SkippedSection({ count }: { count: number }) {
  return (
    <div className="px-4 py-2 text-xs/5 text-muted-foreground italic text-center bg-muted/30">
      {count} unchanged {count === 1 ? 'paragraph' : 'paragraphs'}
    </div>
  );
}
