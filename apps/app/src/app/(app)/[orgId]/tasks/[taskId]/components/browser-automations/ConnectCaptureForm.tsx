'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/design-system';
import { Locked } from '@trycompai/design-system/icons';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const captureSchema = z.object({
  username: z.string().trim().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  totpSeed: z.string().trim().optional(),
});

export type ConnectCaptureFormData = z.infer<typeof captureSchema>;

interface ConnectCaptureFormProps {
  isSubmitting: boolean;
  onSubmit: (data: ConnectCaptureFormData) => void;
}

export function ConnectCaptureForm({ isSubmitting, onSubmit }: ConnectCaptureFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectCaptureFormData>({
    resolver: zodResolver(captureSchema),
    defaultValues: { username: '', password: '', totpSeed: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-foreground">The details we can&apos;t see</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The scheduler needs these to sign in on its own. Stored encrypted — never shared.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="capture-username">Username or email</Label>
        <Input id="capture-username" autoComplete="off" {...register('username')} />
        {errors.username?.message && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="capture-password">Password</Label>
        <Input id="capture-password" type="password" autoComplete="off" {...register('password')} />
        {errors.password?.message && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <Label htmlFor="capture-totp">Authenticator setup key</Label>
          <span className="text-xs text-muted-foreground">Optional — recommended</span>
        </div>
        <Input id="capture-totp" placeholder="e.g. JBSW Y3DP EHPK 3PXP" {...register('totpSeed')} />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Shown when you set up the authenticator app (&ldquo;can&apos;t scan? enter this
          key&rdquo;). Lets scheduled runs generate the codes themselves.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Locked size={12} className="shrink-0" />
        Encrypted · stored in 1Password
      </div>

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        Save &amp; Finish
      </Button>
    </form>
  );
}
