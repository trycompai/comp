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
  Input,
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

const subPhaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  defaultDurationWeeks: z.number().min(1, 'Min 1 week'),
  completionType: z.string().min(1),
  locksTimelineOnComplete: z.boolean().optional(),
});

type SubPhaseFormValues = z.infer<typeof subPhaseSchema>;

interface SubPhaseRowProps {
  phase: AdminTimelinePhaseTemplate;
  templateId: string;
  index: number;
  totalInGroup: number;
  onMutate: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export function SubPhaseRow({
  phase,
  templateId,
  index,
  totalInGroup,
  onMutate,
  onMove,
}: SubPhaseRowProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<SubPhaseFormValues>({
    resolver: zodResolver(subPhaseSchema),
    defaultValues: {
      name: phase.name,
      defaultDurationWeeks: phase.defaultDurationWeeks,
      completionType: phase.completionType ?? 'MANUAL',
      locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
    },
  });

  const completionType = watch('completionType');

  const handleSave = async (values: SubPhaseFormValues) => {
    setSaving(true);
    const res = await api.patch(
      `/v1/admin/timeline-templates/${templateId}/phases/${phase.id}`,
      {
        name: values.name,
        defaultDurationWeeks: values.defaultDurationWeeks,
        completionType: values.completionType,
        locksTimelineOnComplete: values.locksTimelineOnComplete ?? false,
      },
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Sub-phase updated');
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
    toast.success('Sub-phase deleted');
    onMutate();
  };

  return (
    <form
      onSubmit={handleSubmit(handleSave)}
      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
    >
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
          disabled={index === totalInGroup - 1}
        />
      </div>

      <div className="min-w-0 flex-1">
        <Input
          {...register('name')}
          placeholder="Sub-phase name"
        />
      </div>

      <div className="w-24 shrink-0">
        <Input
          type="number"
          min={1}
          {...register('defaultDurationWeeks', { valueAsNumber: true })}
        />
      </div>

      <div className="w-36 shrink-0">
        <Select
          value={completionType}
          onValueChange={(val) => {
            if (val) setValue('completionType', val, { shouldDirty: true });
          }}
        >
          <SelectTrigger size="sm">
            <span className="text-sm">
              {COMPLETION_OPTIONS.find((o) => o.value === completionType)
                ?.label ?? completionType}
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

      <div className="w-20 shrink-0 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          {...register('locksTimelineOnComplete')}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        variant="outline"
        iconLeft={<Save size={14} />}
        loading={saving}
        disabled={!isDirty}
      />
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
            <AlertDialogTitle>Delete sub-phase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this sub-phase from the template.
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
    </form>
  );
}
