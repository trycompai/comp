'use client';

import { addCommentAction } from '@/actions/add-comment';
import { getAddCommentSchema } from '@/actions/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { Textarea } from '@comp/ui/textarea';
import { CommentEntityType } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export function CreateCommentForm({
  entityId,
  entityType,
}: {
  entityId: string;
  entityType: CommentEntityType;
}) {
  const t = useGT();
  const addCommentSchema = getAddCommentSchema(t);
  const addComment = useAction(addCommentAction, {
    onSuccess: () => {
      toast.success(t('Comment added successfully'));
      form.reset();
    },
    onError: () => {
      toast.error(t('Error adding comment'));
    },
  });

  const onSubmit = (data: z.infer<typeof addCommentSchema>) => {
    addComment.execute({
      ...data,
      entityId,
      entityType,
    });
  };

  const form = useForm<z.infer<typeof addCommentSchema>>({
    resolver: zodResolver(addCommentSchema),
    defaultValues: {
      content: '',
      entityId,
      entityType,
    },
    mode: 'onChange',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['comment']}>
              <AccordionItem value="comment">
                <AccordionTrigger>
                  <T>Comment</T>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      variant="default"
                      disabled={addComment.status === 'executing'}
                    >
                      <div className="flex items-center justify-center">
                        <T>Create</T>
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </div>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </form>
    </Form>
  );
}
