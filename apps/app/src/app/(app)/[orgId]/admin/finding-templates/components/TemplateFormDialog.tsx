'use client';

import {
  useAdminFindingTemplates,
  type FindingTemplate,
} from '@/hooks/use-admin-finding-templates';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FINDING_TEMPLATE_CATEGORIES } from './constants';

const templateSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required').max(50000),
  order: z.number().int().min(0),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  template: FindingTemplate | null;
  onClose: () => void;
}

const emptyDefaults: TemplateFormValues = {
  category: FINDING_TEMPLATE_CATEGORIES[0].value,
  title: '',
  content: '',
  order: 0,
};

export function TemplateFormDialog({ open, template, onClose }: TemplateFormDialogProps) {
  const { mutate } = useAdminFindingTemplates();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(template);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: emptyDefaults,
  });

  // Populate the form whenever it opens (create -> blank, edit -> template).
  useEffect(() => {
    if (!open) return;
    reset(
      template
        ? {
            category: template.category,
            title: template.title,
            content: template.content,
            order: template.order,
          }
        : emptyDefaults,
    );
  }, [open, template, reset]);

  const handleSave = async (values: TemplateFormValues) => {
    setSaving(true);
    const res = isEdit
      ? await api.patch(`/v1/finding-template/${template!.id}`, values)
      : await api.post('/v1/finding-template', values);
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(isEdit ? 'Template updated' : 'Template created');
    mutate();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Template' : 'New Template'}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form onSubmit={handleSubmit(handleSave)}>
            <Stack gap="md">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {FINDING_TEMPLATE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <Text size="xs" variant="destructive">
                    {errors.category.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ft-title">Title</Label>
                <Input id="ft-title" {...register('title')} placeholder="Template title" />
                {errors.title && (
                  <Text size="xs" variant="destructive">
                    {errors.title.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ft-content">Content</Label>
                <Textarea
                  id="ft-content"
                  rows={6}
                  {...register('content')}
                  placeholder="Template content..."
                />
                {errors.content && (
                  <Text size="xs" variant="destructive">
                    {errors.content.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ft-order">Order</Label>
                <Input
                  id="ft-order"
                  type="number"
                  min={0}
                  {...register('order', { valueAsNumber: true })}
                />
                {errors.order && (
                  <Text size="xs" variant="destructive">
                    {errors.order.message}
                  </Text>
                )}
              </div>

              <Button type="submit" loading={saving}>
                {isEdit ? 'Save Changes' : 'Create'}
              </Button>
            </Stack>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
