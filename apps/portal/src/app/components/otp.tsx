'use client';

import { authClient } from '@/app/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/ui-shadcn';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { OtpForm } from './otp-form';

const formSchema = z.object({
  email: z.string().email(),
});

type Props = {
  className?: string;
};

export function OtpSignIn({ className }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [isSent, setSent] = useState(false);
  const [_email, setEmail] = useState<string>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onSubmit',
  });

  async function onSubmit({ email }: z.infer<typeof formSchema>) {
    setLoading(true);
    setEmail(email);

    const { data, error } = await authClient.emailOtp.sendVerificationOtp({
      email: email,
      type: 'sign-in',
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      setSent(false);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  if (isSent) {
    return (
      <div className={className}>
        <OtpForm email={_email ?? ''} />
      </div>
    );
  }

  const emailError = form.formState.errors.email?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Your work email"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...form.register('email')}
          />
          {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            'Sending...'
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
