'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelinePhaseTemplate } from '@/hooks/use-admin-timelines';
import { Button, Section, Text } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { PhaseCard } from './PhaseCard';

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

interface PhaseListProps {
  phases: AdminTimelinePhaseTemplate[];
  templateId: string;
  onMutate: () => void;
}

export function PhaseList({ phases, templateId, onMutate }: PhaseListProps) {
  const [adding, setAdding] = useState(false);
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  const groupColors = getGroupColorMap(sorted);

  const handleAddPhase = async () => {
    setAdding(true);
    const res = await api.post(
      `/v1/admin/timeline-templates/${templateId}/phases`,
      {
        name: 'New Phase',
        orderIndex: sorted.length,
        defaultDurationWeeks: 2,
        completionType: 'MANUAL',
      },
    );
    setAdding(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase added');
    onMutate();
  };

  const handleMove = async (
    phaseId: string,
    direction: 'up' | 'down',
  ) => {
    const currentIndex = sorted.findIndex((p) => p.id === phaseId);
    if (currentIndex < 0) return;

    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentPhase = sorted[currentIndex];
    const targetPhase = sorted[targetIndex];

    // Swap order indices
    const [resA, resB] = await Promise.all([
      api.patch(
        `/v1/admin/timeline-templates/${templateId}/phases/${currentPhase.id}`,
        { orderIndex: targetPhase.orderIndex },
      ),
      api.patch(
        `/v1/admin/timeline-templates/${templateId}/phases/${targetPhase.id}`,
        { orderIndex: currentPhase.orderIndex },
      ),
    ]);

    if (resA.error || resB.error) {
      toast.error('Failed to reorder phases');
      return;
    }
    onMutate();
  };

  return (
    <Section>
      <div className="flex items-center justify-between pb-4">
        <Text size="sm" weight="semibold">
          Phases ({sorted.length})
        </Text>
        <Button
          size="sm"
          variant="outline"
          iconLeft={<Add size={16} />}
          loading={adding}
          onClick={handleAddPhase}
        >
          Add Phase
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No phases yet. Add one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((phase, idx) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              templateId={templateId}
              index={idx}
              totalPhases={sorted.length}
              groupColor={
                phase.groupLabel ? (groupColors[phase.groupLabel] ?? null) : null
              }
              onMutate={onMutate}
              onMove={(dir) => handleMove(phase.id, dir)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
