'use client';

import { authClient } from '@/utils/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Label,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface Props {
  currentEmail: string;
}

const buildChangeEmailSchema = (currentEmail: string) =>
  z.object({
    newEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .refine((value) => value !== currentEmail.toLowerCase(), {
        message: 'This is already your login email',
      }),
  });

type ChangeEmailFormValues = z.infer<ReturnType<typeof buildChangeEmailSchema>>;

export function LoginEmailSettings({ currentEmail }: Props) {
  // Tracks which login email the pending request was made against, so the
  // notice disappears once the change completes and currentEmail moves on.
  const [pendingRequest, setPendingRequest] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const pendingEmail =
    pendingRequest && pendingRequest.from === currentEmail
      ? pendingRequest.to
      : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(buildChangeEmailSchema(currentEmail)),
    defaultValues: { newEmail: '' },
  });

  const handleChangeEmail = handleSubmit(async ({ newEmail }) => {
    try {
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: `${window.location.origin}/`,
      });

      if (error) {
        setPendingRequest(null);
        toast.error(error.message ?? 'Failed to request the email change');
        return;
      }

      setPendingRequest({ from: currentEmail, to: newEmail });
      reset();
      toast.success(`Confirmation link sent to ${currentEmail}`);
    } catch {
      setPendingRequest(null);
      toast.error('Failed to request the email change');
    }
  });

  return (
    <Section
      title="Login Email"
      description={`You currently sign in as ${currentEmail}.`}
    >
      <form onSubmit={handleChangeEmail} noValidate>
        <Stack gap="md">
          <Stack gap="sm">
            <Label htmlFor="newEmail">New email address</Label>
            <div className="w-full md:max-w-sm">
              <Input
                id="newEmail"
                type="email"
                placeholder="you@company.com"
                aria-invalid={errors.newEmail ? true : undefined}
                aria-describedby={
                  errors.newEmail ? 'newEmail-error' : undefined
                }
                {...register('newEmail')}
              />
            </div>
            {errors.newEmail ? (
              <div id="newEmail-error" role="alert">
                <Text size="sm" variant="destructive">
                  {errors.newEmail.message}
                </Text>
              </div>
            ) : (
              <Text size="sm" variant="muted">
                We'll send a confirmation link to your current email first,
                then a verification link to the new address to complete the
                change.
              </Text>
            )}
          </Stack>

          <div>
            <Button type="submit" loading={isSubmitting}>
              Change email
            </Button>
          </div>

          {pendingEmail && (
            <div className="bg-muted rounded-md p-3" role="status">
              <Text size="sm" variant="muted">
                We sent a confirmation link to {currentEmail}. Once you confirm
                it, a verification link goes to {pendingEmail} to finish the
                change. If it doesn't arrive, the new address may already be in
                use.
              </Text>
            </div>
          )}
        </Stack>
      </form>
    </Section>
  );
}
