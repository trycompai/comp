'use client';

import { Button } from '@trycompai/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@trycompai/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@trycompai/ui/form';
import { useMediaQuery } from '@trycompai/ui/hooks';
import { Input } from '@trycompai/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@trycompai/ui/sheet';
import { Textarea } from '@trycompai/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';

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

  const form = useForm<z.infer<typeof createRequirementSchema>>({
    resolver: zodResolver(createRequirementSchema),
    defaultValues: {
      name: '',
      identifier: '',
      description: '',
    },
  });

  const onSubmit = useCallback(
    async (data: z.infer<typeof createRequirementSchema>) => {
      setIsSubmitting(true);
      try {
        await apiClient.post('/v1/framework-instance-requirements', {
          ...data,
          frameworkInstanceId,
        });
        toast.success('Requirement created');
        onOpenChange(false);
        form.reset();
        onCreated();
      } catch {
        toast.error('Failed to create requirement');
      } finally {
        setIsSubmitting(false);
      }
    },
    [frameworkInstanceId, form, onOpenChange, onCreated],
  );

  const requirementForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-none">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Requirement Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Access Control Policy"
                  autoCorrect="off"
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Identifier (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., CUSTOM-1"
                  autoCorrect="off"
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-[80px] w-full resize-none"
                  placeholder="Describe what this requirement covers"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent stack className="flex flex-col h-full">
          <SheetHeader className="mb-6 flex flex-row items-center justify-between shrink-0">
            <SheetTitle>Add Custom Requirement</SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0 hover:bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-2 pb-6">{requirementForm}</div>
          </div>

          <div className="border-t bg-background p-4 flex justify-end shrink-0">
            <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
              <div className="flex items-center justify-center">
                Create Requirement
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTitle hidden>Add Custom Requirement</DrawerTitle>
      <DrawerContent className="flex flex-col h-full max-h-[80vh]">
        <div className="flex-1 overflow-y-auto p-6 pb-0">
          <div className="w-full pb-6">{requirementForm}</div>
        </div>

        <div className="border-t bg-background p-4 flex justify-end shrink-0">
          <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-center">
              Create Requirement
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </div>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
