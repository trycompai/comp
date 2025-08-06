'use client';

import { sendFeebackAction } from '@/actions/send-feedback-action';
import { Button } from '@comp/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Textarea } from '@comp/ui/textarea';
import { T, useGT } from 'gt-next';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

export function FeedbackForm() {
  const [value, setValue] = useState('');
  const t = useGT();
  const action = useAction(sendFeebackAction, {
    onSuccess: () => {
      toast.success(t('Thank you for your feedback!'));
      setValue('');
    },
    onError: () => {
      toast.error(t('Error sending feedback - try again?'));
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild className="hidden md:block">
        <T>
          <Button
            variant="outline"
            className="text-muted-foreground h-[32px] rounded-full p-0 px-3 text-xs font-normal"
          >
            Feedback
          </Button>
        </T>
      </PopoverTrigger>
      <PopoverContent className="h-[200px] w-[320px]" sideOffset={10} align="end">
        {action.status === 'hasSucceeded' ? (
          <T>
            <div className="mt-10 flex flex-col items-center justify-center space-y-1 text-center">
              <p className="text-sm font-medium">Thank you for your feedback!</p>
              <p className="text-muted-foreground text-sm">
                We will be back with you as soon as possible
              </p>
            </div>
          </T>
        ) : (
          <form className="space-y-4">
            <Textarea
              name="feedback"
              value={value}
              required
              autoFocus
              placeholder={t('Ideas to improve this page or issues you are experiencing.')}
              className="h-[120px] resize-none"
              onChange={(evt) => setValue(evt.target.value)}
            />

            <div className="mt-1 flex items-center justify-end">
              <Button
                type="button"
                onClick={() => action.execute({ feedback: value })}
                disabled={value.length === 0 || action.status === 'executing'}
              >
                {action.status === 'executing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('Send Feedback')
                )}
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
