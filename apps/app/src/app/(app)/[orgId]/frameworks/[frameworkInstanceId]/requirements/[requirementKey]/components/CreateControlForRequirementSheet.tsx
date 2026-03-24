'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useMediaQuery } from '@trycompai/ui/hooks';
import {
  Button,
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
import { Add, ArrowRight } from '@trycompai/design-system/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createControlSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
});

interface CreateControlForRequirementSheetProps {
  requirementId: string;
  frameworkInstanceId: string;
  isInstanceRequirement: boolean;
  onCreated: () => void;
}

export function CreateControlForRequirementSheet({
  requirementId,
  frameworkInstanceId,
  isInstanceRequirement,
  onCreated,
}: CreateControlForRequirementSheetProps) {
  const { hasPermission } = usePermissions();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createControlSchema>>({
    resolver: zodResolver(createControlSchema),
    defaultValues: {
      name: '',
      description: '',
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
        ...data,
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
