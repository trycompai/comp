'use client';

import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@comp/ui/input-otp';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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

  return (
    <Form {...form}>
      <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputOTP
                  maxLength={INPUT_LENGTH}
                  {...field}
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, index) => (
                        <InputOTPSlot key={index} {...slot} />
                      ))}
                    </InputOTPGroup>
                  )}
                />
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
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Continue</span>}
        </Button>
      </form>
    </Form>
  );
}
