'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminOrgTimeline } from '@/hooks/use-admin-timelines';
import {
  Badge,
  Button,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Checkmark,
  CircleDash,
  InProgress,
  Pause,
  Play,
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

function PhaseStatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <Checkmark size={16} className="text-green-500" />;
  if (status === 'IN_PROGRESS') return <InProgress size={16} className="text-blue-500" />;
  return <CircleDash size={16} className="text-zinc-500" />;
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
        <TimelinePhaseBar phases={sortedPhases} />
      </div>

      <div className="flex items-center gap-4 pb-3 text-xs text-muted-foreground">
        <span>Start: {formatDate(timeline.startDate)}</span>
        <span>Est. end: {formatDate(timeline.estimatedEndDate)}</span>
        {timeline.completedAt && (
          <span>Completed: {formatDate(timeline.completedAt)}</span>
        )}
      </div>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>Phase</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            {timeline.status !== 'COMPLETED' && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPhases.map((phase) => (
            <TableRow key={phase.id}>
              <TableCell>
                <PhaseStatusIcon status={phase.status} />
              </TableCell>
              <TableCell>
                <Text size="sm" weight="medium">{phase.name}</Text>
              </TableCell>
              <TableCell>
                <Text size="sm">{phase.durationWeeks}w</Text>
              </TableCell>
              <TableCell>
                <Text size="xs" variant="muted">
                  {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                </Text>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {phase.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              {timeline.status !== 'COMPLETED' && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingPhaseId(phase.id)}
                  >
                    Edit
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

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

  // COMPLETED — no actions
  return null;
}
