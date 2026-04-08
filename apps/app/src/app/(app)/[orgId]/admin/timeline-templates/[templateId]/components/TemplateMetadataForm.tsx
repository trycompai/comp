'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminTimelineTemplate } from '@/hooks/use-admin-timelines';
import { Button, Input, Label, Text } from '@trycompai/design-system';
import { Save } from '@trycompai/design-system/icons';

const metadataSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  cycleNumber: z.number().min(1, 'Cycle must be at least 1'),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

interface TemplateMetadataFormProps {
  template: AdminTimelineTemplate;
  onMutate: () => void;
}

export function TemplateMetadataForm({
  template,
  onMutate,
}: TemplateMetadataFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: template.name,
      cycleNumber: template.cycleNumber,
    },
  });

  const handleSave = async (values: MetadataFormValues) => {
    setSaving(true);
    const res = await api.patch(
      `/v1/admin/timeline-templates/${template.id}`,
      { name: values.name, cycleNumber: values.cycleNumber },
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Template updated');
    onMutate();
  };

  return (
    <form onSubmit={handleSubmit(handleSave)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            {...register('name')}
            placeholder="e.g. SOC 2 Initial Audit"
          />
          {errors.name && (
            <Text size="xs" variant="destructive">
              {errors.name.message}
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="template-framework">Framework</Label>
          <Input
            id="template-framework"
            value={template.framework?.name ?? template.frameworkId}
            disabled
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="template-cycle">Cycle Number</Label>
          <Input
            id="template-cycle"
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
      </div>

      <div className="flex pt-4">
        <Button
          type="submit"
          size="sm"
          iconLeft={<Save size={16} />}
          loading={saving}
          disabled={!isDirty}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
