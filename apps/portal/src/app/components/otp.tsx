'use client';

import { authClient } from '@/app/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Input, VStack } from '@trycompai/ui-v2';
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
      <VStack align="stretch" gap="4" className={className}>
        <OtpForm email={_email ?? ''} />
      </VStack>
    );
  }

  const emailError = form.formState.errors.email?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <VStack align="stretch" gap="4">
        <Field.Root invalid={!!emailError}>
          <Field.Label>Email</Field.Label>
          <Input
            placeholder="Your work email"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...form.register('email')}
          />
          {emailError ? <Field.ErrorText>{emailError}</Field.ErrorText> : null}
        </Field.Root>

        <Button type="submit" w="full" size="lg" loading={isLoading} colorPalette="primary">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </VStack>
    </form>
  );
}
