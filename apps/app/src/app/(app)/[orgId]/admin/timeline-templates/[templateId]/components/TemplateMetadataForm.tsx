'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { api, apiClient } from '@/lib/api-client';
import type { AdminTimelineTemplate } from '@/hooks/use-admin-timelines';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@trycompai/design-system';
import { Save } from '@trycompai/design-system/icons';

const metadataSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  frameworkId: z.string().min(1, 'Please select a framework'),
  cycleNumber: z.number().min(1, 'Cycle must be at least 1'),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

interface Framework {
  id: string;
  name: string;
}

interface TemplateMetadataFormProps {
  template: AdminTimelineTemplate;
  onMutate: () => void;
}

export function TemplateMetadataForm({
  template,
  onMutate,
}: TemplateMetadataFormProps) {
  const [saving, setSaving] = useState(false);

  const { data: frameworks = [] } = useSWR(
    ['/v1/frameworks/available'],
    async () => {
      const res = await apiClient.get<{ data: Framework[] }>(
        '/v1/frameworks/available',
      );
      if (res.error) throw new Error(res.error);
      return res.data?.data ?? [];
    },
    { revalidateOnFocus: false },
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: template.name,
      frameworkId: template.frameworkId,
      cycleNumber: template.cycleNumber,
    },
  });

  const handleSave = async (values: MetadataFormValues) => {
    setSaving(true);
    try {
      const res = await api.patch(
        `/v1/admin/timeline-templates/${template.id}`,
        values,
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Template updated');
      // Reset form defaults so isDirty flips back to false after a save.
      reset(values);
      onMutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSave)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            {...register('name')}
            placeholder="e.g. SOC 2 Type 2"
          />
          {errors.name && (
            <Text size="xs" variant="destructive">{errors.name.message}</Text>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label>Framework</Label>
          <Controller
            control={control}
            name="frameworkId"
            render={({ field }) => {
              const selectedName = frameworks.find((fw) => fw.id === field.value)?.name
                ?? template.framework?.name
                ?? field.value;
              return (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a framework">{selectedName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {frameworks.map((fw) => (
                    <SelectItem key={fw.id} value={fw.id}>
                      {fw.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              );
            }}
          />
          {errors.frameworkId && (
            <Text size="xs" variant="destructive">{errors.frameworkId.message}</Text>
          )}
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
            <Text size="xs" variant="destructive">{errors.cycleNumber.message}</Text>
          )}
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            size="sm"
            iconLeft={<Save size={16} />}
            loading={saving}
            disabled={!isDirty}
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
