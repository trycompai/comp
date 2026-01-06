'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { login } from '../actions/login';

const INPUT_LENGTH = 6;

const otpFormSchema = z.object({
  otp: z.string().min(INPUT_LENGTH, 'OTP is required'),
});

type OtpFormValues = z.infer<typeof otpFormSchema>;

interface OtpFormProps {
  email: string;
}

export function OtpForm({ email }: OtpFormProps) {
  const router = useRouter();
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
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
    await execute({
      otp: formData.otp,
      email,
    });
  };

  const otpError = form.formState.errors.otp?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="otp">One-time password</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            {...form.register('otp')}
          />
          {otpError ? <p className="text-sm text-destructive">{otpError}</p> : null}
        </div>

        <Button type="submit" disabled={isExecuting}>
          {isExecuting ? 'Continuing...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
