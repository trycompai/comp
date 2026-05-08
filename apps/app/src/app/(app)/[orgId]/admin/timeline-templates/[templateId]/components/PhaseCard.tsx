'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelinePhaseTemplate } from '@/hooks/use-admin-timelines';
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
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Text,
} from '@trycompai/design-system';
import {
  ArrowDown,
  ArrowUp,
  Save,
  TrashCan,
} from '@trycompai/design-system/icons';

const COMPLETION_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTO_TASKS', label: 'Auto (Tasks)' },
  { value: 'AUTO_POLICIES', label: 'Auto (Policies)' },
  { value: 'AUTO_PEOPLE', label: 'Auto (People)' },
  { value: 'AUTO_FINDINGS', label: 'Auto (Findings)' },
  { value: 'AUTO_UPLOAD', label: 'Auto (Upload)' },
] as const;

const phaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  defaultDurationWeeks: z.number().min(1, 'Min 1 week'),
  completionType: z.string().min(1),
  groupLabel: z.string().optional(),
  locksTimelineOnComplete: z.boolean().optional(),
});

type PhaseFormValues = z.infer<typeof phaseSchema>;

interface PhaseCardProps {
  phase: AdminTimelinePhaseTemplate;
  templateId: string;
  index: number;
  totalPhases: number;
  groupColor: string | null;
  phaseNumber: number;
  onMutate: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export function PhaseCard({
  phase,
  templateId,
  index,
  totalPhases,
  groupColor,
  phaseNumber,
  onMutate,
  onMove,
}: PhaseCardProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: phase.name,
      description: phase.description ?? '',
      defaultDurationWeeks: phase.defaultDurationWeeks,
      completionType: phase.completionType ?? 'MANUAL',
      groupLabel: phase.groupLabel ?? '',
      locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
    },
  });

  const completionType = watch('completionType');

  const handleSave = async (values: PhaseFormValues) => {
    setSaving(true);
    const res = await api.patch(
      `/v1/admin/timeline-templates/${templateId}/phases/${phase.id}`,
      {
        name: values.name,
        description: values.description || undefined,
        defaultDurationWeeks: values.defaultDurationWeeks,
        completionType: values.completionType,
        groupLabel: values.groupLabel || null,
        locksTimelineOnComplete: values.locksTimelineOnComplete ?? false,
      },
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase updated');
    onMutate();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await api.delete(
      `/v1/admin/timeline-templates/${templateId}/phases/${phase.id}`,
    );
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Phase deleted');
    onMutate();
  };

  return (
    <div className="flex gap-2">
      {groupColor && (
        <div
          className="w-1 shrink-0 rounded-full"
          style={{ backgroundColor: groupColor }}
        />
      )}
      <div className="flex-1">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(handleSave)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 pb-3">
                  <Text size="xs" variant="muted">
                    Phase {phaseNumber}
                  </Text>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      iconLeft={<ArrowUp size={14} />}
                      onClick={() => onMove('up')}
                      disabled={index === 0}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      iconLeft={<ArrowDown size={14} />}
                      onClick={() => onMove('down')}
                      disabled={index === totalPhases - 1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`phase-${phase.id}-name`}>Name</Label>
                    <Input
                      id={`phase-${phase.id}-name`}
                      {...register('name')}
                      placeholder="Phase name"
                    />
                    {errors.name && (
                      <Text size="xs" variant="destructive">
                        {errors.name.message}
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`phase-${phase.id}-desc`}>
                      Description
                    </Label>
                    <Input
                      id={`phase-${phase.id}-desc`}
                      {...register('description')}
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`phase-${phase.id}-duration`}>
                      Duration (weeks)
                    </Label>
                    <Input
                      id={`phase-${phase.id}-duration`}
                      type="number"
                      min={1}
                      {...register('defaultDurationWeeks', {
                        valueAsNumber: true,
                      })}
                    />
                    {errors.defaultDurationWeeks && (
                      <Text size="xs" variant="destructive">
                        {errors.defaultDurationWeeks.message}
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Completion Type</Label>
                    <Select
                      value={completionType}
                      onValueChange={(val) => {
                        if (val) setValue('completionType', val, { shouldDirty: true });
                      }}
                    >
                      <SelectTrigger size="sm">
                        <span className="text-sm">
                          {COMPLETION_OPTIONS.find(
                            (o) => o.value === completionType,
                          )?.label ?? completionType}
                        </span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {COMPLETION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id={`phase-${phase.id}-lock`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      {...register('locksTimelineOnComplete')}
                    />
                    <Label htmlFor={`phase-${phase.id}-lock`}>
                      Lock timeline when this phase completes
                    </Label>
                  </div>

                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-1 pt-6">
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  iconLeft={<Save size={14} />}
                  loading={saving}
                  disabled={!isDirty}
                >
                  Save
                </Button>
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        iconLeft={<TrashCan size={14} />}
                        loading={deleting}
                      />
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete phase?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this phase and all its
                        configuration from the template.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setDeleteOpen(false);
                          handleDelete();
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
