'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import { useAccessRevocations } from '@/hooks/use-access-revocations';
import { Badge } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';

export function StatusCircle({ done, total }: { done: number; total: number }) {
  const allDone = done === total && total > 0;
  const partial = done > 0 && !allDone;

  if (allDone) {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Checkmark size={11} />
      </div>
    );
  }
  if (partial) {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary">
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>
    );
  }
  return (
    <div
      className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px]"
      style={{ borderColor: 'oklch(0.85 0 0)' }}
    />
  );
}

/** Amber dash — the step is resolved as an exception, not actually completed. */
export function ExceptionStatusCircle() {
  return (
    <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
      <div className="h-[2px] w-2 rounded-full bg-white" />
    </div>
  );
}

export function ChecklistStatusCircle({
  item,
  memberId,
}: {
  item: ChecklistItem;
  memberId: string;
}) {
  if (item.isAccessRevocation) {
    return <AccessRevocationStatusCircle memberId={memberId} />;
  }
  if (item.isException) {
    return <ExceptionStatusCircle />;
  }
  const done = item.completed ? 1 : 0;
  return <StatusCircle done={done} total={1} />;
}

function AccessRevocationStatusCircle({ memberId }: { memberId: string }) {
  const { revocations } = useAccessRevocations(memberId);
  if (!revocations) return <StatusCircle done={0} total={0} />;
  return (
    <StatusCircle
      done={revocations.revokedCount}
      total={revocations.totalVendors}
    />
  );
}

export function ItemBadges({ item }: { item: ChecklistItem }) {
  return (
    <>
      {item.isAccessRevocation && (
        <div>
          <Badge variant="accent">Critical</Badge>
        </div>
      )}
      {item.evidenceRequired && (
        <div>
          <Badge variant="outline">Evidence</Badge>
        </div>
      )}
      {item.isException && (
        <div>
          <Badge variant="secondary">Exception</Badge>
        </div>
      )}
    </>
  );
}

export function ItemProgress({
  item,
  memberId,
}: {
  item: ChecklistItem;
  memberId: string;
}) {
  if (item.isAccessRevocation) {
    return <AccessRevocationProgress memberId={memberId} />;
  }
  if (item.isException) {
    return (
      <span className="text-xs font-medium text-amber-600">Exception</span>
    );
  }
  return <ProgressBar done={item.completed ? 1 : 0} total={1} />;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[56px] text-right font-mono text-xs tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
      <div className="h-1 w-[60px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function AccessRevocationProgress({ memberId }: { memberId: string }) {
  const { revocations } = useAccessRevocations(memberId);
  if (!revocations) return null;
  return (
    <ProgressBar
      done={revocations.revokedCount}
      total={revocations.totalVendors}
    />
  );
}
