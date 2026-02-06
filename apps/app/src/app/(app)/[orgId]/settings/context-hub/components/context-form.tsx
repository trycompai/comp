'use client';

import { useApi } from '@/hooks/use-api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import type { Context } from '@db';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ContextForm({ entry, onSuccess }: { entry?: Context; onSuccess?: () => void }) {
  const api = useApi();
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setIsPending(true);
    try {
      if (entry) {
        const response = await api.patch(`/v1/context/${entry.id}`, {
          question: formData.get('question') as string,
          answer: formData.get('answer') as string,
        });
        if (response.error) {
          toast.error('Something went wrong');
          return;
        }
        toast.success('Context entry updated');
        onSuccess?.();
      } else {
        const response = await api.post('/v1/context', {
          question: formData.get('question') as string,
          answer: formData.get('answer') as string,
        });
        if (response.error) {
          toast.error('Something went wrong');
          return;
        }
        toast.success('Context entry created');
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
    }
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
