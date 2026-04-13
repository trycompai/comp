'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelinePhaseTemplate } from '@/hooks/use-admin-timelines';
import { Button, Section, Text } from '@trycompai/design-system';
import { Add, GroupObjects } from '@trycompai/design-system/icons';
import { PhaseCard } from './PhaseCard';
import { PhaseGroupCard } from './PhaseGroupCard';

const GROUP_COLORS = [
  'var(--primary)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function getGroupColorMap(
  phases: AdminTimelinePhaseTemplate[],
): Record<string, string> {
  const labels = new Set<string>();
  for (const p of phases) {
    if (p.groupLabel) labels.add(p.groupLabel);
  }
  const map: Record<string, string> = {};
  let idx = 0;
  for (const label of labels) {
    map[label] = GROUP_COLORS[idx % GROUP_COLORS.length];
    idx++;
  }
  return map;
}

type PhaseListEntry =
  | { type: 'ungrouped'; phase: AdminTimelinePhaseTemplate }
  | { type: 'group'; label: string; phases: AdminTimelinePhaseTemplate[] };

function buildPhaseEntries(
  phases: AdminTimelinePhaseTemplate[],
): PhaseListEntry[] {
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  const entries: PhaseListEntry[] = [];
  const seenGroups = new Set<string>();

  for (const phase of sorted) {
    if (!phase.groupLabel) {
      entries.push({ type: 'ungrouped', phase });
      continue;
    }
    if (seenGroups.has(phase.groupLabel)) continue;
    seenGroups.add(phase.groupLabel);
    const groupPhases = sorted.filter(
      (p) => p.groupLabel === phase.groupLabel,
    );
    entries.push({ type: 'group', label: phase.groupLabel, phases: groupPhases });
  }

  return entries;
}

interface PhaseListProps {
  phases: AdminTimelinePhaseTemplate[];
  templateId: string;
  onMutate: () => void;
}

export function PhaseList({ phases, templateId, onMutate }: PhaseListProps) {
  const [addingPhase, setAddingPhase] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);

  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  const groupColors = getGroupColorMap(sorted);
  const entries = buildPhaseEntries(phases);

  const handleAddPhase = async () => {
    setAddingPhase(true);
    const res = await api.post(
      `/v1/admin/timeline-templates/${templateId}/phases`,
      {
        name: 'New Phase',
        orderIndex: sorted.length,
        defaultDurationWeeks: 2,
        completionType: 'MANUAL',
        locksTimelineOnComplete: false,
      },
    );
    setAddingPhase(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase added');
    onMutate();
  };

  const handleAddGroup = async () => {
    setAddingGroup(true);
    const res = await api.post(
      `/v1/admin/timeline-templates/${templateId}/phases`,
      {
        name: 'New Sub-phase',
        orderIndex: sorted.length,
        defaultDurationWeeks: 2,
        completionType: 'MANUAL',
        locksTimelineOnComplete: false,
        groupLabel: 'New Group',
      },
    );
    setAddingGroup(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Group created');
    onMutate();
  };

  const handleSwapPhases = async (
    phaseIdA: string,
    orderA: number,
    phaseIdB: string,
    orderB: number,
  ) => {
    const [resA, resB] = await Promise.all([
      api.patch(
        `/v1/admin/timeline-templates/${templateId}/phases/${phaseIdA}`,
        { orderIndex: orderA },
      ),
      api.patch(
        `/v1/admin/timeline-templates/${templateId}/phases/${phaseIdB}`,
        { orderIndex: orderB },
      ),
    ]);
    if (resA.error || resB.error) {
      toast.error('Failed to reorder phases');
      return;
    }
    onMutate();
  };

  const handleMoveUngrouped = async (
    phaseId: string,
    direction: 'up' | 'down',
  ) => {
    const currentIndex = sorted.findIndex((p) => p.id === phaseId);
    if (currentIndex < 0) return;
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    await handleSwapPhases(
      sorted[currentIndex].id,
      sorted[targetIndex].orderIndex,
      sorted[targetIndex].id,
      sorted[currentIndex].orderIndex,
    );
  };

  return (
    <Section>
      <div className="flex items-center justify-between pb-4">
        <Text size="sm" weight="semibold">
          Phases ({entries.length})
        </Text>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            iconLeft={<GroupObjects size={16} />}
            loading={addingGroup}
            onClick={handleAddGroup}
          >
            Add Group
          </Button>
          <Button
            size="sm"
            variant="outline"
            iconLeft={<Add size={16} />}
            loading={addingPhase}
            onClick={handleAddPhase}
          >
            Add Phase
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No phases yet. Add one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, entryIdx) => {
            const phaseNumber = entryIdx + 1;
            if (entry.type === 'group') {
              return (
                <PhaseGroupCard
                  key={`group-${entry.label}`}
                  groupLabel={entry.label}
                  phases={entry.phases}
                  templateId={templateId}
                  groupColor={groupColors[entry.label] ?? GROUP_COLORS[0]}
                  phaseNumber={phaseNumber}
                  onMutate={onMutate}
                  onSwapPhases={handleSwapPhases}
                />
              );
            }
            return (
              <PhaseCard
                key={entry.phase.id}
                phase={entry.phase}
                templateId={templateId}
                index={entryIdx}
                totalPhases={entries.length}
                groupColor={null}
                phaseNumber={phaseNumber}
                onMutate={onMutate}
                onMove={(dir) => handleMoveUngrouped(entry.phase.id, dir)}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
