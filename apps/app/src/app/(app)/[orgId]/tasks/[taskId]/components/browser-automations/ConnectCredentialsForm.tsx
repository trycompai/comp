'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/design-system';
import { ArrowRight, Locked, View, ViewOff } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const connectCredentialsSchema = z.object({
  url: z.string().trim().url({ message: 'Enter a valid website URL' }),
  username: z.string().trim().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  totpSeed: z.string().trim().optional(),
});

export type ConnectCredentialsFormData = z.infer<typeof connectCredentialsSchema>;

interface ConnectCredentialsFormProps {
  initialUrl?: string;
  isSubmitting: boolean;
  onSubmit: (data: ConnectCredentialsFormData) => void;
  onCancel: () => void;
}

export function ConnectCredentialsForm({
  initialUrl,
  isSubmitting,
  onSubmit,
  onCancel,
}: ConnectCredentialsFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectCredentialsFormData>({
    resolver: zodResolver(connectCredentialsSchema),
    defaultValues: {
      url: initialUrl ?? '',
      username: '',
      password: '',
      totpSeed: '',
    },
  });

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-4 sm:px-6 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">Connect a vendor login</h3>
          <span className="font-mono text-xs text-muted-foreground">1·2</span>
        </div>
        <div className="mt-3 flex gap-1">
          <div className="h-[3px] flex-1 rounded-full bg-primary" />
          <div className="h-[3px] flex-1 rounded-full bg-muted" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Enter the login once. Comp AI uses it to sign in for scheduled evidence runs — you
          won&apos;t be asked again.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="connect-url">Website URL</Label>
          <Input id="connect-url" placeholder="https://github.com" {...register('url')} />
          {errors.url?.message && <p className="text-xs text-destructive">{errors.url.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="connect-username">Username or email</Label>
          <Input
            id="connect-username"
            autoComplete="off"
            placeholder="compliance@acme.com"
            {...register('username')}
          />
          {errors.username?.message && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="connect-password">Password</Label>
          <div className="relative">
            <Input
              id="connect-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              style={{ paddingRight: '2.25rem' }}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <ViewOff size={16} /> : <View size={16} />}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor="connect-totp">Authenticator app setup key</Label>
            <span className="text-xs text-muted-foreground">Optional — recommended</span>
          </div>
          <Input
            id="connect-totp"
            placeholder="e.g. JBSW Y3DP EHPK 3PXP"
            {...register('totpSeed')}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            When you set up two-factor in an authenticator app, the site shows a QR code and a text
            key labeled &ldquo;can&apos;t scan? enter this key.&rdquo; Paste that key and we can
            generate the 6-digit codes ourselves, so scheduled runs never wait on your phone.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-md bg-muted px-3 py-2.5">
          <Locked size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Encrypted end-to-end and stored in <span className="text-foreground">1Password</span>.
            Used only to sign in for evidence collection — never shared, removable anytime.
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            Continue to sign-in
            <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </div>
  );
}
