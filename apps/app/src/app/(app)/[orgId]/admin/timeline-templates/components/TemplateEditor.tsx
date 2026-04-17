'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelineTemplate } from '@/hooks/use-admin-timelines';
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';
import { PhaseRow } from './PhaseRow';
import {
  getDefaults,
  createNewTemplate,
  saveExistingTemplate,
} from './template-actions';

const phaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  defaultDurationWeeks: z.number().min(1, 'Must be at least 1 week'),
  completionType: z.enum([
    'AUTO_TASKS',
    'AUTO_POLICIES',
    'AUTO_PEOPLE',
    'AUTO_FINDINGS',
    'AUTO_UPLOAD',
    'MANUAL',
  ]),
  locksTimelineOnComplete: z.boolean().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  frameworkId: z.string().min(1, 'Framework ID is required'),
  cycleNumber: z.number().min(1, 'Cycle must be at least 1'),
  phases: z.array(phaseSchema),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  open: boolean;
  onClose: () => void;
  template: AdminTimelineTemplate | null;
  onMutate: () => void;
}

export function TemplateEditor({
  open,
  onClose,
  template,
  onMutate,
}: TemplateEditorProps) {
  const isEditing = !!template;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: getDefaults(template),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'phases',
  });

  useEffect(() => {
    reset(getDefaults(template));
  }, [template, reset]);

  const handleSave = async (values: TemplateFormValues) => {
    setSaving(true);
    try {
      if (isEditing) {
        await saveExistingTemplate(template, values);
      } else {
        await createNewTemplate(values);
      }
      onMutate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    setDeleting(true);
    const res = await api.delete(
      `/v1/admin/timeline-templates/${template.id}`,
    );
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Template deleted');
    onMutate();
    onClose();
  };

  const handleAddPhase = () => {
    append({
      name: '',
      description: '',
      defaultDurationWeeks: 2,
      completionType: 'MANUAL',
      locksTimelineOnComplete: false,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Template' : 'New Template'}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form onSubmit={handleSubmit(handleSave)}>
            <Stack gap="md">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. SOC 2 Initial Audit"
                />
                {errors.name && (
                  <Text size="xs" variant="destructive">
                    {errors.name.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="frameworkId">Framework ID</Label>
                <Input
                  id="frameworkId"
                  {...register('frameworkId')}
                  disabled={isEditing}
                  placeholder="Framework ID"
                />
                {errors.frameworkId && (
                  <Text size="xs" variant="destructive">
                    {errors.frameworkId.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cycleNumber">Cycle Number</Label>
                <Input
                  id="cycleNumber"
                  type="number"
                  min={1}
                  {...register('cycleNumber', { valueAsNumber: true })}
                />
                {errors.cycleNumber && (
                  <Text size="xs" variant="destructive">
                    {errors.cycleNumber.message}
                  </Text>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Text size="sm" weight="semibold">
                  Phases
                </Text>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  iconLeft={<Add size={16} />}
                  onClick={handleAddPhase}
                >
                  Add Phase
                </Button>
              </div>

              {fields.length === 0 && (
                <div className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                  No phases yet. Add one above.
                </div>
              )}

              {fields.map((field, index) => (
                <PhaseRow
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  onRemove={() => remove(index)}
                />
              ))}

              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" loading={saving}>
                  {isEditing ? 'Save Changes' : 'Create Template'}
                </Button>
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    iconLeft={<TrashCan size={16} />}
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    Delete
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
