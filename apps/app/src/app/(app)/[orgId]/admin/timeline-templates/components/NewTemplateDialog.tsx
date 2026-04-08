'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAdminTimelineTemplates } from '@/hooks/use-admin-timelines';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';

const newTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  frameworkId: z.string().min(1, 'Framework ID is required'),
  cycleNumber: z.number().min(1, 'Cycle must be at least 1'),
});

type NewTemplateFormValues = z.infer<typeof newTemplateSchema>;

interface NewTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewTemplateDialog({ open, onClose }: NewTemplateDialogProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { mutate } = useAdminTimelineTemplates();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewTemplateFormValues>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: { name: '', frameworkId: '', cycleNumber: 1 },
  });

  const handleCreate = async (values: NewTemplateFormValues) => {
    setSaving(true);
    const res = await api.post<{ id: string }>(
      '/v1/admin/timeline-templates',
      {
        name: values.name,
        frameworkId: values.frameworkId,
        cycleNumber: values.cycleNumber,
      },
    );
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success('Template created');
    reset();
    mutate();
    onClose();

    const created = res.data;
    if (created?.id) {
      router.push(`/${orgId}/admin/timeline-templates/${created.id}`);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Template</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form onSubmit={handleSubmit(handleCreate)}>
            <Stack gap="md">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-name">Template Name</Label>
                <Input
                  id="new-name"
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
                <Label htmlFor="new-frameworkId">Framework ID</Label>
                <Input
                  id="new-frameworkId"
                  {...register('frameworkId')}
                  placeholder="Framework ID"
                />
                {errors.frameworkId && (
                  <Text size="xs" variant="destructive">
                    {errors.frameworkId.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-cycleNumber">Cycle Number</Label>
                <Input
                  id="new-cycleNumber"
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

              <Button type="submit" loading={saving}>
                Create Template
              </Button>
            </Stack>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
