'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminOrgTimeline } from '@/hooks/use-admin-timelines';
import {
  Badge,
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Checkmark, Locked } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';

const COMPLETION_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTO_TASKS', label: 'Auto (Tasks)' },
  { value: 'AUTO_POLICIES', label: 'Auto (Policies)' },
  { value: 'AUTO_PEOPLE', label: 'Auto (People)' },
  { value: 'AUTO_FINDINGS', label: 'Auto (Findings)' },
  { value: 'AUTO_UPLOAD', label: 'Auto (Upload)' },
] as const;

const phaseUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  durationWeeks: z.number().min(1, 'Must be at least 1 week'),
  startDate: z.string().optional(),
  completionType: z.enum([
    'AUTO_TASKS',
    'AUTO_POLICIES',
    'AUTO_PEOPLE',
    'AUTO_FINDINGS',
    'AUTO_UPLOAD',
    'MANUAL',
  ]),
  locksTimelineOnComplete: z.boolean(),
});

type PhaseUpdateValues = z.infer<typeof phaseUpdateSchema>;
type TimelinePhase = AdminOrgTimeline['phases'][number];

interface TimelinePhaseEditorProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  timelineId: string;
  phase: TimelinePhase | null;
  onMutate: () => void;
}

function toDateInput(date: string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function addWeeks(dateStr: string, weeks: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TimelinePhaseEditor({
  open,
  onClose,
  orgId,
  timelineId,
  phase,
  onMutate,
}: TimelinePhaseEditorProps) {
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PhaseUpdateValues>({
    resolver: zodResolver(phaseUpdateSchema),
    defaultValues: phaseDefaults(phase),
  });

  useEffect(() => {
    reset(phaseDefaults(phase));
  }, [phase, reset]);

  const watchedStart = watch('startDate');
  const watchedDuration = watch('durationWeeks');
  const watchedLock = watch('locksTimelineOnComplete');
  const calculatedEnd = watchedStart && watchedDuration
    ? addWeeks(watchedStart, watchedDuration)
    : null;

  const handleSave = async (values: PhaseUpdateValues) => {
    if (!phase) return;
    setSaving(true);
    const res = await api.patch(
      `/v1/admin/organizations/${orgId}/timelines/${timelineId}/phases/${phase.id}`,
      {
        name: values.name,
        description: values.description || undefined,
        durationWeeks: values.durationWeeks,
        completionType: values.completionType,
        startDate: values.startDate
          ? new Date(values.startDate).toISOString()
          : undefined,
        locksTimelineOnComplete: values.locksTimelineOnComplete,
      },
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase updated — downstream dates recalculated');
    onMutate();
    onClose();
  };

  const handleComplete = async () => {
    if (!phase) return;
    setCompleting(true);
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/timelines/${timelineId}/phases/${phase.id}/complete`,
    );
    setCompleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase marked as completed');
    onMutate();
    onClose();
  };

  if (!phase) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Phase: {phase.name}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form onSubmit={handleSubmit(handleSave)}>
            <Stack gap="md">
              <div className="flex items-center justify-between rounded-md border p-2">
                <Text size="sm" variant="muted">Lock on completion</Text>
                <Badge variant={watchedLock ? 'default' : 'outline'}>
                  {watchedLock ? (
                    <>
                      <Locked size={12} />
                      Enabled
                    </>
                  ) : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="phase-lock-toggle"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  {...register('locksTimelineOnComplete')}
                />
                <Label htmlFor="phase-lock-toggle">
                  Lock timeline when this phase completes
                </Label>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phase-name">Name</Label>
                <Input id="phase-name" {...register('name')} />
                {errors.name && (
                  <Text size="xs" variant="destructive">{errors.name.message}</Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phase-description">Description</Label>
                <Input id="phase-description" {...register('description')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phase-duration">Duration (weeks)</Label>
                  <Input
                    id="phase-duration"
                    type="number"
                    min={1}
                    {...register('durationWeeks', { valueAsNumber: true })}
                  />
                  {errors.durationWeeks && (
                    <Text size="xs" variant="destructive">{errors.durationWeeks.message}</Text>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phase-start">Start Date</Label>
                  <Input id="phase-start" type="date" {...register('startDate')} />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="phase-completionType">Resolution</Label>
                  <select
                    id="phase-completionType"
                    {...register('completionType')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {COMPLETION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {calculatedEnd && (
                <div className="text-sm text-muted-foreground">
                  Calculated end date: <span className="font-medium text-foreground">{calculatedEnd}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" loading={saving}>
                  Save Changes
                </Button>
                {phase.status !== 'COMPLETED' && (
                  <Button
                    type="button"
                    variant="outline"
                    iconLeft={<Checkmark size={14} />}
                    loading={completing}
                    onClick={handleComplete}
                  >
                    Complete Phase
                  </Button>
                )}
              </div>
            </Stack>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function phaseDefaults(phase: TimelinePhase | null): PhaseUpdateValues {
  if (!phase) {
    return {
      name: '',
      durationWeeks: 2,
      completionType: 'MANUAL',
      locksTimelineOnComplete: false,
    };
  }
  return {
    name: phase.name,
    description: phase.description ?? '',
    durationWeeks: phase.durationWeeks,
    startDate: toDateInput(phase.startDate),
    completionType: phase.completionType,
    locksTimelineOnComplete: phase.locksTimelineOnComplete,
  };
}
