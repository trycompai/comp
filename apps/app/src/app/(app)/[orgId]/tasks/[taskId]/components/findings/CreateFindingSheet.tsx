'use client';

import {
  useFindingActions,
  useFindingTemplates,
  FINDING_CATEGORY_LABELS,
  FINDING_TYPE_LABELS,
  DEFAULT_FINDING_TEMPLATES,
  type FindingTemplate,
} from '@/hooks/use-findings-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { useMediaQuery } from '@comp/ui/hooks';
import { FindingType } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createFindingSchema = z.object({
  type: z.nativeEnum(FindingType),
  templateId: z.string().nullable().optional(),
  content: z.string().min(1, {
    message: 'Finding content is required',
  }),
});

interface CreateFindingSheetProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateFindingSheet({
  taskId,
  open,
  onOpenChange,
  onSuccess,
}: CreateFindingSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: templatesData } = useFindingTemplates();
  const { createFinding } = useFindingActions();

  const form = useForm<z.infer<typeof createFindingSchema>>({
    resolver: zodResolver(createFindingSchema),
    defaultValues: {
      type: FindingType.soc2,
      templateId: null,
      content: '',
    },
  });

  // Watch for template selection
  const selectedTemplateId = form.watch('templateId');

  // Get templates array from the API response, fall back to defaults if empty
  const apiTemplates: FindingTemplate[] = templatesData?.data || [];
  const templates: FindingTemplate[] = apiTemplates.length > 0 ? apiTemplates : DEFAULT_FINDING_TEMPLATES;

  // Find the selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || templates.length === 0) return null;
    return templates.find((t) => t.id === selectedTemplateId);
  }, [selectedTemplateId, templates]);

  // Auto-fill content when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      form.setValue('content', selectedTemplate.content);
    }
  }, [selectedTemplate, form]);

  const onSubmit = useCallback(
    async (data: z.infer<typeof createFindingSchema>) => {
      setIsSubmitting(true);
      try {
        // Don't save templateId for built-in default templates (they don't exist in DB)
        const templateId = data.templateId?.startsWith('default_') ? undefined : data.templateId;
        
        await createFinding({
          taskId,
          type: data.type,
          templateId: templateId || undefined,
          content: data.content,
        });
        toast.success('Finding created successfully');
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create finding');
      } finally {
        setIsSubmitting(false);
      }
    },
    [createFinding, taskId, onOpenChange, form, onSuccess],
  );

  const handleTemplateChange = useCallback(
    (value: string | null, onChange: (value: string | null) => void) => {
      if (!value || value === 'none') {
        onChange(null);
        form.setValue('content', '');
      } else {
        onChange(value);
      }
    },
    [form],
  );

  // Group templates by category for the selector
  const groupedTemplates = useMemo((): Record<string, FindingTemplate[]> => {
    return templates.reduce<Record<string, FindingTemplate[]>>(
      (acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      },
      {},
    );
  }, [templates]);

  const findingForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-none">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Finding Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  {FINDING_TYPE_LABELS[field.value as FindingType]}
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FINDING_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => {
            const selectedTpl = selectedTemplate;
            return (
              <FormItem className="w-full">
                <FormLabel>Finding Template (Optional)</FormLabel>
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => handleTemplateChange(value, field.onChange)}
                >
                  <SelectTrigger>
                    {selectedTpl ? selectedTpl.title : 'Select a template...'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template - Custom finding</SelectItem>
                    {Object.entries(groupedTemplates).map(([category, templates]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>
                          {FINDING_CATEGORY_LABELS[category] || category}
                        </SelectLabel>
                        {(templates as FindingTemplate[]).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Finding Details</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe the finding in detail..."
                  rows={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
            iconRight={<ArrowRight size={16} />}
          >
            Create Finding
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Finding</SheetTitle>
          </SheetHeader>
          <SheetBody>{findingForm}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create Finding</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">{findingForm}</div>
      </DrawerContent>
    </Drawer>
  );
}
