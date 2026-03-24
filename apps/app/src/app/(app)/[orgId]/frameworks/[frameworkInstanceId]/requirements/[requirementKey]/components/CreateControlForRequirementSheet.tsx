'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useMediaQuery } from '@trycompai/ui/hooks';
import {
  Button,
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  HStack,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  useComboboxAnchor,
} from '@trycompai/design-system';
import { Add, ArrowRight } from '@trycompai/design-system/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createControlSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  taskIds: z.array(z.string()).optional(),
  policyIds: z.array(z.string()).optional(),
});

interface CreateControlForRequirementSheetProps {
  requirementId: string;
  frameworkInstanceId: string;
  isInstanceRequirement: boolean;
  onCreated: () => void;
  availableTasks: { id: string; title: string }[];
  availablePolicies: { id: string; name: string }[];
}

export function CreateControlForRequirementSheet({
  requirementId,
  frameworkInstanceId,
  isInstanceRequirement,
  onCreated,
  availableTasks,
  availablePolicies,
}: CreateControlForRequirementSheetProps) {
  const { hasPermission } = usePermissions();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof createControlSchema>>({
    resolver: zodResolver(createControlSchema),
    defaultValues: {
      name: '',
      description: '',
      taskIds: [],
      policyIds: [],
    },
  });

  if (!hasPermission('control', 'create')) return null;

  const onSubmit = async (data: z.infer<typeof createControlSchema>) => {
    setIsSubmitting(true);
    try {
      const mapping = isInstanceRequirement
        ? { frameworkInstanceRequirementId: requirementId, frameworkInstanceId }
        : { requirementId, frameworkInstanceId };

      await apiClient.post('/v1/controls', {
        name: data.name,
        description: data.description,
        taskIds: data.taskIds,
        policyIds: data.policyIds,
        requirementMappings: [mapping],
      });
      toast.success('Control created');
      setIsOpen(false);
      reset();
      onCreated();
    } catch {
      toast.error('Failed to create control');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trigger = (
    <Button iconLeft={<Add size={16} />} onClick={() => setIsOpen(true)}>
      Create Control
    </Button>
  );

  const controlForm = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Control Name</FieldLabel>
          <Input
            id="name"
            {...register('name')}
            autoFocus
            placeholder="A short, descriptive name for the control."
            autoCorrect="off"
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="A detailed description of the control and what it covers."
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          name="taskIds"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Tasks (Optional)</FieldLabel>
              <ItemCombobox
                items={availableTasks.map((t) => ({ id: t.id, name: t.title }))}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Search tasks..."
              />
            </Field>
          )}
        />

        <Controller
          name="policyIds"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Policies (Optional)</FieldLabel>
              <ItemCombobox
                items={availablePolicies}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Search policies..."
              />
            </Field>
          )}
        />
      </FieldGroup>

      <SheetFooter>
        <HStack justify="end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
            {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </HStack>
      </SheetFooter>
    </form>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create New Control</SheetTitle>
            </SheetHeader>
            <SheetBody>{controlForm}</SheetBody>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create New Control</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">{controlForm}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function ItemCombobox({
  items,
  value,
  onChange,
  placeholder,
}: {
  items: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const anchorRef = useComboboxAnchor();

  const selectedItems = useMemo(
    () => items.filter((item) => value.includes(item.id)),
    [items, value],
  );

  return (
    <Combobox
      multiple
      value={selectedItems}
      onValueChange={(newSelected) => {
        onChange((newSelected as { id: string; name: string }[]).map((item) => item.id));
      }}
    >
      <ComboboxChips ref={anchorRef}>
        {selectedItems.map((item) => (
          <ComboboxChip key={item.id} value={item}>
            {item.name}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
