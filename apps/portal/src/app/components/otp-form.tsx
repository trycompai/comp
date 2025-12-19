'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, PinInput, VStack } from '@trycompai/ui-v2';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { login } from '../actions/login';

const INPUT_LENGTH = 6;

const otpFormSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(INPUT_LENGTH, 'OTP is required'),
});

type OtpFormValues = z.infer<typeof otpFormSchema>;

interface OtpFormProps {
  email: string;
}

export function OtpForm({ email }: OtpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      email,
      otp: '',
    },
  });

  const { execute, isExecuting } = useAction(login, {
    onSuccess: () => {
      toast.success('OTP verified');
      router.push('/');
    },
    onError: (error) => {
      toast.error(error.error.serverError as string);
    },
  });

  const onSubmit = async (formData: OtpFormValues) => {
    try {
      setIsLoading(true);

      await execute({
        otp: formData.otp,
        email: formData.email,
      });
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const otpError = form.formState.errors.otp?.message;
  const otpChars = form.watch('otp').split('').slice(0, INPUT_LENGTH);
  const pinValue = Array.from({ length: INPUT_LENGTH }).map((_, i) => otpChars[i] ?? '');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <VStack align="start" gap="3">
        <Field.Root invalid={!!otpError}>
          <Field.Label>One-time password</Field.Label>
          <PinInput.Root
            value={pinValue}
            onValueChange={(e) =>
              form.setValue('otp', e.value.join(''), { shouldValidate: true, shouldDirty: true })
            }
            otp
          >
            <PinInput.Control>
              {Array.from({ length: INPUT_LENGTH }).map((_, index) => (
                <PinInput.Input key={index} index={index} />
              ))}
              <PinInput.HiddenInput />
            </PinInput.Control>
          </PinInput.Root>
          {otpError ? <Field.ErrorText>{otpError}</Field.ErrorText> : null}
        </Field.Root>

        <Button type="submit" loading={isLoading} colorPalette="primary">
          Continue
        </Button>
      </VStack>
    </form>
  );
}
