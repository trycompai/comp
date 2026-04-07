'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminOrgTimeline } from '@/hooks/use-admin-timelines';
import { Badge, Button, Section } from '@trycompai/design-system';
import {
  Checkmark,
  CircleDash,
  InProgress,
  Pause,
  Play,
  Edit,
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

function formatDate(date: string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
    timeline.frameworkInstance?.framework.name ?? 'Unknown Framework';
  const sortedPhases = [...timeline.phases].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const handlePause = async () => {
    setActionLoading(true);
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/pause`,
    );
    setActionLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Timeline paused');
    onMutate();
  };

  const handleResume = async () => {
    setActionLoading(true);
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/timelines/${timeline.id}/resume`,
    );
    setActionLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Timeline resumed');
    onMutate();
  };

  return (
    <Section
      title={frameworkName}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <TimelineActions
            status={timeline.status}
            orgId={orgId}
            timelineId={timeline.id}
            loading={actionLoading}
            onPause={handlePause}
            onResume={handleResume}
            onMutate={onMutate}
          />
        </div>
      }
    >
      <div className="pb-3">
        <TimelinePhaseBar phases={sortedPhases} showDates />
      </div>

      {/* Phase cards stack */}
      <div className="flex flex-col gap-2">
        {sortedPhases.map((phase) => (
          <PhaseRow
            key={phase.id}
            phase={phase}
            editable={timeline.status !== 'COMPLETED'}
            onEdit={() => setEditingPhaseId(phase.id)}
          />
        ))}
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
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${borderClass}`}
    >
      <div className="shrink-0">
        <PhaseStatusIcon status={phase.status} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{phase.name}</span>
        <span className="text-xs text-muted-foreground">
          {phase.durationWeeks}w · {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
        </span>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px]">
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

function TimelineActions({
  status,
  orgId,
  timelineId,
  loading,
  onPause,
  onResume,
  onMutate,
}: {
  status: AdminOrgTimeline['status'];
  orgId: string;
  timelineId: string;
  loading: boolean;
  onPause: () => void;
  onResume: () => void;
  onMutate: () => void;
}) {
  if (status === 'DRAFT') {
    return (
      <TimelineActivateForm
        orgId={orgId}
        timelineId={timelineId}
        onMutate={onMutate}
      />
    );
  }

  if (status === 'ACTIVE') {
    return (
      <Button
        size="sm"
        variant="outline"
        iconLeft={<Pause size={14} />}
        loading={loading}
        onClick={onPause}
      >
        Pause
      </Button>
    );
  }

  if (status === 'PAUSED') {
    return (
      <Button
        size="sm"
        variant="outline"
        iconLeft={<Play size={14} />}
        loading={loading}
        onClick={onResume}
      >
        Resume
      </Button>
    );
  }

  return null;
}
