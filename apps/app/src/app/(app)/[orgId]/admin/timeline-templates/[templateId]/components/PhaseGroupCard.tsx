'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelinePhaseTemplate } from '@/hooks/use-admin-timelines';
import {
  Button,
  Card,
  CardContent,
  Input,
  Text,
} from '@trycompai/design-system';
import { Add, Save } from '@trycompai/design-system/icons';
import { SubPhaseRow } from './SubPhaseRow';

interface PhaseGroupCardProps {
  groupLabel: string;
  phases: AdminTimelinePhaseTemplate[];
  templateId: string;
  groupColor: string;
  phaseNumber: number;
  onMutate: () => void;
  onSwapPhases: (
    phaseIdA: string,
    orderA: number,
    phaseIdB: string,
    orderB: number,
  ) => Promise<void>;
}

export function PhaseGroupCard({
  groupLabel,
  phases,
  templateId,
  groupColor,
  phaseNumber,
  onMutate,
  onSwapPhases,
}: PhaseGroupCardProps) {
  const [adding, setAdding] = useState(false);
  const [editingLabel, setEditingLabel] = useState(groupLabel);
  const [savingLabel, setSavingLabel] = useState(false);

  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalDuration = sorted.reduce(
    (sum, p) => sum + p.defaultDurationWeeks,
    0,
  );
  const isLabelDirty = editingLabel !== groupLabel;

  const handleAddSubPhase = async () => {
    setAdding(true);
    const maxOrder = Math.max(...sorted.map((p) => p.orderIndex), -1);
    const res = await api.post(
      `/v1/admin/timeline-templates/${templateId}/phases`,
      {
        name: 'New Sub-phase',
        orderIndex: maxOrder + 1,
        defaultDurationWeeks: 1,
        completionType: 'MANUAL',
        locksTimelineOnComplete: false,
        groupLabel,
      },
    );
    setAdding(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Sub-phase added');
    onMutate();
  };

  const handleSaveGroupLabel = async () => {
    if (!editingLabel.trim()) {
      toast.error('Group label cannot be empty');
      return;
    }
    setSavingLabel(true);
    const results = await Promise.all(
      sorted.map((phase) =>
        api.patch(
          `/v1/admin/timeline-templates/${templateId}/phases/${phase.id}`,
          { groupLabel: editingLabel.trim() },
        ),
      ),
    );
    setSavingLabel(false);
    const failed = results.find((r) => r.error);
    if (failed) {
      toast.error('Failed to update group label');
      return;
    }
    toast.success('Group label updated');
    onMutate();
  };

  const handleMoveWithinGroup = async (
    phaseId: string,
    direction: 'up' | 'down',
  ) => {
    const idx = sorted.findIndex((p) => p.id === phaseId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    await onSwapPhases(
      sorted[idx].id,
      sorted[targetIdx].orderIndex,
      sorted[targetIdx].id,
      sorted[idx].orderIndex,
    );
  };

  return (
    <div className="flex gap-2">
      <div
        className="w-1 shrink-0 rounded-full"
        style={{ backgroundColor: groupColor }}
      />
      <div className="flex-1">
        <Card>
          <CardContent>
            <div className="flex flex-col gap-2 pb-3">
              <div className="flex items-center justify-between gap-3">
                <Text size="xs" variant="muted">Phase {phaseNumber}</Text>
                <div className="flex items-center gap-3">
                  <Text size="xs" variant="muted">
                    {totalDuration}w total
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<Add size={14} />}
                    loading={adding}
                    onClick={handleAddSubPhase}
                  >
                    Add Sub-phase
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="max-w-xs">
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                  />
                </div>
                {isLabelDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<Save size={14} />}
                    loading={savingLabel}
                    onClick={handleSaveGroupLabel}
                  >
                    Rename
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {/* Column labels */}
              <div className="flex items-center gap-2 px-3">
                <div className="w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Text size="xs" variant="muted">Name</Text>
                </div>
                <div className="w-24 shrink-0">
                  <Text size="xs" variant="muted">Duration (wk)</Text>
                </div>
                <div className="w-36 shrink-0">
                  <Text size="xs" variant="muted">Completion</Text>
                </div>
                <div className="w-20 shrink-0 text-center">
                  <Text size="xs" variant="muted">Lock</Text>
                </div>
                <div className="w-16 shrink-0" />
              </div>
              {sorted.map((phase, idx) => (
                <SubPhaseRow
                  key={phase.id}
                  phase={phase}
                  templateId={templateId}
                  index={idx}
                  totalInGroup={sorted.length}
                  onMutate={onMutate}
                  onMove={(dir) => handleMoveWithinGroup(phase.id, dir)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
