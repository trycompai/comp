'use client';

import { createContextEntryAction } from '@/actions/context-hub/create-context-entry-action';
import { updateContextEntryAction } from '@/actions/context-hub/update-context-entry-action';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import type { Context } from '@db';
import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function ContextForm({ entry, onSuccess }: { entry?: Context; onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (entry) {
          const result = await updateContextEntryAction({
            id: entry.id,
            question: formData.get('question') as string,
            answer: formData.get('answer') as string,
          });
          if (result?.data) {
            toast.success('Context entry updated');
            onSuccess?.();
          }
        } else {
          const result = await createContextEntryAction({
            question: formData.get('question') as string,
            answer: formData.get('answer') as string,
          });
          if (result?.data) {
            toast.success('Context entry created');
            onSuccess?.();
          }
        }
      } catch (error) {
        toast.error('Something went wrong');
      }
    });
  }

  return (
    <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
      <Accordion type="multiple" defaultValue={['context']}>
        <AccordionItem value="context">
          <AccordionTrigger>{'Context Entry'}</AccordionTrigger>
          <AccordionContent>
            <form action={onSubmit} className="flex flex-col gap-4 space-y-4">
              <input type="hidden" name="id" value={entry?.id} />
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <div className="mt-3">
                  <Input
                    id="question"
                    name="question"
                    placeholder="What is the company's mission?"
                    defaultValue={entry?.question}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">Answer</Label>
                <div className="mt-3">
                  <Textarea
                    id="answer"
                    name="answer"
                    placeholder="Our mission is to provide the best possible service to our customers."
                    defaultValue={entry?.answer}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="justify-self-end">
                {entry ? 'Update' : 'Create'}{' '}
                {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
