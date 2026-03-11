'use client';

import { authClient } from '@/app/lib/auth-client';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@comp/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@comp/ui/input-otp';
import { Spinner } from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const INPUT_LENGTH = 6;

const otpFormSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(INPUT_LENGTH, 'OTP is required'),
});

type OtpFormValues = z.infer<typeof otpFormSchema>;

interface OtpFormProps {
  email: string;
  deviceAuthRedirect?: string;
}

export function OtpForm({ email, deviceAuthRedirect }: OtpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      email,
      otp: '',
    },
  });

  const onSubmit = async (formData: OtpFormValues) => {
    try {
      setIsLoading(true);

      const { error } = await authClient.signIn.emailOtp({
        email: formData.email,
        otp: formData.otp,
      });

      if (error) {
        const lower = (error.message || '').toLowerCase();

        if (lower.includes('invalid') && lower.includes('otp')) {
          toast.error('Invalid OTP code. Please check your code and try again.');
        } else if (lower.includes('expired') && lower.includes('otp')) {
          toast.error('OTP code has expired. Please request a new code.');
        } else if (lower.includes('not found') || lower.includes('user not found')) {
          toast.error('No account found with this email address.');
        } else {
          toast.error('Login failed. Please check your OTP code and try again.');
        }
        return;
      }

      toast.success('OTP verified');
      router.push(deviceAuthRedirect || '/');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form className="grid gap-4 place-items-center" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputOTP maxLength={INPUT_LENGTH} {...field}>
                  <InputOTPGroup>
                    {Array.from({ length: INPUT_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="flex h-[40px] w-fit space-x-2 px-6 py-4 font-medium active:scale-[0.98]"
        >
          {isLoading ? <Spinner size="sm" /> : <span>Continue</span>}
        </Button>
      </form>
    </Form>
  );
}
