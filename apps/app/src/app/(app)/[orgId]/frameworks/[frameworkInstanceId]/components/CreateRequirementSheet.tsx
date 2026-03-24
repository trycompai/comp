'use client';

import { apiClient } from '@/lib/api-client';
import { useMediaQuery } from '@trycompai/ui/hooks';
import { Button } from '@trycompai/ui/button';
import {
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
} from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createRequirementSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  identifier: z.string().optional(),
  description: z.string().min(1, { message: 'Description is required' }),
});

interface CreateRequirementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkInstanceId: string;
  onCreated: () => void;
}

export function CreateRequirementSheet({
  open,
  onOpenChange,
  frameworkInstanceId,
  onCreated,
}: CreateRequirementSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createRequirementSchema>>({
    resolver: zodResolver(createRequirementSchema),
    defaultValues: {
      name: '',
      identifier: '',
      description: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof createRequirementSchema>) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/v1/framework-instance-requirements', {
        ...data,
        frameworkInstanceId,
      });
      toast.success('Requirement created');
      onOpenChange(false);
      reset();
      onCreated();
    } catch {
      toast.error('Failed to create requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requirementForm = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Requirement Name</FieldLabel>
          <Input
            id="name"
            {...register('name')}
            autoFocus
            placeholder="A short, descriptive name for the requirement."
            autoCorrect="off"
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="identifier">Identifier (Optional)</FieldLabel>
          <Input
            id="identifier"
            {...register('identifier')}
            placeholder="e.g., CUSTOM-1"
            autoCorrect="off"
          />
          <FieldError errors={[errors.identifier]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="A detailed description of what this requirement covers."
          />
          <FieldError errors={[errors.description]} />
        </Field>
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Requirement</SheetTitle>
          </SheetHeader>
          <SheetBody>{requirementForm}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Requirement</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">{requirementForm}</div>
      </DrawerContent>
    </Drawer>
  );
}
