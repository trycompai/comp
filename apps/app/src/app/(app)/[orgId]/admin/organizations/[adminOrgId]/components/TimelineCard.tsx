'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminOrgTimeline } from '@/hooks/use-admin-timelines';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Section,
  Textarea,
} from '@trycompai/design-system';
import {
  Checkmark,
  CircleDash,
  InProgress,
  Locked,
  Pause,
  Play,
  Edit,
  Reset,
  TrashCan,
  Unlocked,
} from '@trycompai/design-system/icons';
import { TimelinePhaseBar } from '@/app/(app)/[orgId]/overview/components/TimelinePhaseBar';
import { TimelineActivateForm } from './TimelineActivateForm';
import { TimelinePhaseEditor } from './TimelinePhaseEditor';

const STATUS_BADGE: Record<
  AdminOrgTimeline['status'],
  { label: string; variant: 'default' | 'outline' | 'destructive' }
> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'default' },
  PAUSED: { label: 'Paused', variant: 'destructive' },
  COMPLETED: { label: 'Completed', variant: 'default' },
};

const PHASE_COMPLETION_LABEL: Record<
  AdminOrgTimeline['phases'][number]['completionType'],
  string
> = {
  MANUAL: 'Manual',
  AUTO_TASKS: 'Auto (Tasks)',
  AUTO_POLICIES: 'Auto (Policies)',
  AUTO_PEOPLE: 'Auto (People)',
  AUTO_FINDINGS: 'Auto (Findings)',
  AUTO_UPLOAD: 'Auto (Upload)',
};

function formatDate(date: string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type PhaseEntry =
  | { type: 'ungrouped'; phase: AdminOrgTimeline['phases'][number] }
  | { type: 'group'; label: string; phases: AdminOrgTimeline['phases'] };

function buildPhaseEntries(phases: AdminOrgTimeline['phases']): PhaseEntry[] {
  const entries: PhaseEntry[] = [];
  const seen = new Set<string>();
  for (const phase of phases) {
    if (!phase.groupLabel) {
      entries.push({ type: 'ungrouped', phase });
      continue;
    }
    if (seen.has(phase.groupLabel)) continue;
    seen.add(phase.groupLabel);
    entries.push({
      type: 'group',
      label: phase.groupLabel,
      phases: phases.filter((p) => p.groupLabel === phase.groupLabel),
    });
  }
  return entries;
}

interface TimelineCardProps {
  timeline: AdminOrgTimeline;
  orgId: string;
  onMutate: () => void;
}

export function TimelineCard({ timeline, orgId, onMutate }: TimelineCardProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const badge = STATUS_BADGE[timeline.status];
  const frameworkName =
    timeline.template?.name ??
    timeline.frameworkInstance?.framework.name ??
    'Unknown Framework';
  const sortedPhases = [...timeline.phases].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const runAction = async (
    method: 'post' | 'delete',
    path: string,
    successMsg: string,
    body?: unknown,
  ) => {
    setActionLoading(true);
    const res = await (
      method === 'delete'
        ? api.delete(path, undefined, body)
        : api.post(path, body)
    );
    setActionLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(successMsg);
    onMutate();
  };

  return (
    <Section
      title={frameworkName}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {timeline.lockedAt ? (
            <Badge variant="outline">
              <Locked size={12} />
              Locked
            </Badge>
          ) : null}
          <TimelineActions
            status={timeline.status}
            lockedAt={timeline.lockedAt}
            orgId={orgId}
            timelineId={timeline.id}
            loading={actionLoading}
            onPause={() =>
              runAction('post', `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/pause`, 'Timeline paused')
            }
            onResume={() =>
              runAction('post', `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/resume`, 'Timeline resumed')
            }
            onReset={() =>
              runAction('post', `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/reset`, 'Timeline reset to draft')
            }
            onDelete={() =>
              runAction('delete', `/v1/admin/organizations/${orgId}/timelines/${timeline.id}`, 'Timeline deleted')
            }
            onStartNextCycle={() =>
              runAction('post', `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/next-cycle`, 'Next cycle created as draft')
            }
            onUnlock={(unlockReason) =>
              runAction(
                'post',
                `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/unlock`,
                'Timeline unlocked',
                { unlockReason },
              )
            }
            onMutate={onMutate}
          />
        </div>
      }
    >
      <div className="pb-3">
        <TimelinePhaseBar phases={sortedPhases} showDates />
      </div>

      <div className="flex flex-col gap-2">
        {buildPhaseEntries(sortedPhases).map((entry) => {
          if (entry.type === 'group') {
            return (
              <div key={`group-${entry.label}`} className="flex gap-2">
                <div className="w-1 shrink-0 rounded-full bg-primary" />
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground px-1">{entry.label}</span>
                  {entry.phases.map((phase) => (
                    <PhaseRow
                      key={phase.id}
                      phase={phase}
                      editable={timeline.status !== 'COMPLETED'}
                      onEdit={() => setEditingPhaseId(phase.id)}
                    />
                  ))}
                </div>
              </div>
            );
          }
          const phase = entry.phase;
          return (
            <PhaseRow
              key={phase.id}
              phase={phase}
              editable={timeline.status !== 'COMPLETED'}
              onEdit={() => setEditingPhaseId(phase.id)}
            />
          );
        })}
      </div>

      {editingPhaseId && (
        <TimelinePhaseEditor
          open={!!editingPhaseId}
          onClose={() => setEditingPhaseId(null)}
          orgId={orgId}
          timelineId={timeline.id}
          phase={sortedPhases.find((p) => p.id === editingPhaseId) ?? null}
          onMutate={onMutate}
        />
      )}
    </Section>
  );
}

function PhaseRow({
  phase,
  editable,
  onEdit,
}: {
  phase: AdminOrgTimeline['phases'][number];
  editable: boolean;
  onEdit: () => void;
}) {
  const isCompleted = phase.status === 'COMPLETED';
  const isActive = phase.status === 'IN_PROGRESS';
  const borderClass = isCompleted
    ? 'border-primary/30 bg-primary/5'
    : isActive
      ? 'border-primary/40 bg-primary/10'
      : 'border-border bg-muted/20';

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${borderClass}`}>
      <div className="shrink-0">
        <PhaseStatusIcon status={phase.status} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{phase.name}</span>
        <span className="text-xs text-muted-foreground">
          {phase.durationWeeks}w · {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
        </span>
      </div>
      {phase.locksTimelineOnComplete ? (
        <Badge variant="outline">
          <Locked size={12} />
          Lock
        </Badge>
      ) : null}
      <Badge variant="outline">
        {PHASE_COMPLETION_LABEL[phase.completionType]}
      </Badge>
      <Badge variant="outline">
        {phase.status.replace('_', ' ')}
      </Badge>
      {editable && (
        <button
          onClick={onEdit}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Edit size={14} />
        </button>
      )}
    </div>
  );
}

function PhaseStatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <Checkmark size={16} className="text-primary" />;
  if (status === 'IN_PROGRESS') return <InProgress size={16} className="text-primary" />;
  return <CircleDash size={16} className="text-muted-foreground" />;
}

function ConfirmButton({
  title,
  description,
  onConfirm,
  loading,
  variant = 'outline',
  icon,
  children,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  loading: boolean;
  variant?: 'outline' | 'destructive';
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant={variant} iconLeft={icon} loading={loading}>
            {children}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TimelineActions({
  status,
  lockedAt,
  orgId,
  timelineId,
  loading,
  onPause,
  onResume,
  onReset,
  onDelete,
  onStartNextCycle,
  onUnlock,
  onMutate,
}: {
  status: AdminOrgTimeline['status'];
  lockedAt: string | null;
  orgId: string;
  timelineId: string;
  loading: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDelete: () => void;
  onStartNextCycle: () => void;
  onUnlock: (unlockReason: string) => void;
  onMutate: () => void;
}) {
  if (status === 'DRAFT') {
    return (
      <div className="flex items-center gap-2">
        <TimelineActivateForm orgId={orgId} timelineId={timelineId} onMutate={onMutate} />
        <ConfirmButton
          title="Delete Timeline"
          description="This will permanently delete this timeline and all its phases. This cannot be undone."
          onConfirm={onDelete}
          loading={loading}
          variant="destructive"
          icon={<TrashCan size={14} />}
        >
          Delete
        </ConfirmButton>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <div className="flex items-center gap-2">
        {lockedAt ? (
          <UnlockDialogButton onConfirm={onUnlock} loading={loading} />
        ) : null}
        <ConfirmButton
          title="Pause Timeline"
          description="Pausing will stop auto-completion checks. You can resume later and dates will be adjusted."
          onConfirm={onPause}
          loading={loading}
          icon={<Pause size={14} />}
        >
          Pause
        </ConfirmButton>
        <ConfirmButton
          title="Reset Timeline"
          description="This will reset all phases to pending and the timeline back to draft. All progress will be lost."
          onConfirm={onReset}
          loading={loading}
          icon={<Reset size={14} />}
        >
          Reset
        </ConfirmButton>
      </div>
    );
  }

  if (status === 'PAUSED') {
    return (
      <div className="flex items-center gap-2">
        {lockedAt ? (
          <UnlockDialogButton onConfirm={onUnlock} loading={loading} />
        ) : null}
        <ConfirmButton
          title="Resume Timeline"
          description="Resuming will adjust dates forward based on the pause duration."
          onConfirm={onResume}
          loading={loading}
          icon={<Play size={14} />}
        >
          Resume
        </ConfirmButton>
        <ConfirmButton
          title="Reset Timeline"
          description="This will reset all phases to pending and the timeline back to draft. All progress will be lost."
          onConfirm={onReset}
          loading={loading}
          icon={<Reset size={14} />}
        >
          Reset
        </ConfirmButton>
      </div>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <div className="flex items-center gap-2">
        <ConfirmButton
          title="Start Next Cycle"
          description="This will create a new timeline for the next audit cycle using the appropriate template. The new timeline will start as a draft."
          onConfirm={onStartNextCycle}
          loading={loading}
          icon={<Play size={14} />}
        >
          Start Next Cycle
        </ConfirmButton>
        <ConfirmButton
          title="Delete Timeline"
          description="This will permanently delete this completed timeline. This cannot be undone."
          onConfirm={onDelete}
          loading={loading}
          variant="destructive"
          icon={<TrashCan size={14} />}
        >
          Delete
        </ConfirmButton>
      </div>
    );
  }

  return null;
}

function UnlockDialogButton({
  onConfirm,
  loading,
}: {
  onConfirm: (unlockReason: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const trimmedReason = unlockReason.trim();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setUnlockReason('');
      }}
    >
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="outline" iconLeft={<Unlocked size={14} />} loading={loading}>
            Unlock
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlock Timeline</AlertDialogTitle>
          <AlertDialogDescription>
            Unlocking will re-enable automation checks. A reason is required for audit history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="timeline-unlock-reason" className="text-sm font-medium">
            Unlock reason
          </label>
          <Textarea
            id="timeline-unlock-reason"
            value={unlockReason}
            onChange={(event) => setUnlockReason(event.target.value)}
            placeholder="Explain why this locked timeline is being reopened..."
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || trimmedReason.length === 0}
            onClick={(event) => {
              if (trimmedReason.length === 0) {
                event.preventDefault();
                return;
              }
              setOpen(false);
              onConfirm(trimmedReason);
            }}
          >
            Unlock Timeline
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
