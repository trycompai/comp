'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/design-system';
import { Add, ChevronDown, ChevronRight, Close, Locked } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

const captureSchema = z.object({
  username: z.string().trim().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  totpSeed: z.string().trim().optional(),
  extraFields: z
    .array(
      z.object({
        label: z.string().trim().min(1, { message: 'Field name is required' }),
        value: z.string().trim().min(1, { message: 'Value is required' }),
      }),
    )
    .optional(),
});

export type ConnectCaptureFormData = z.infer<typeof captureSchema>;

interface ConnectCaptureFormProps {
  isSubmitting: boolean;
  onSubmit: (data: ConnectCaptureFormData) => void;
  /** Field labels detected on the vendor login (workspace, subdomain, …). */
  initialExtraFields?: { label: string }[];
  submitLabel?: string;
}

export function ConnectCaptureForm({
  isSubmitting,
  onSubmit,
  initialExtraFields,
  submitLabel = 'Sign in for me',
}: ConnectCaptureFormProps) {
  const hasDetectedFields = (initialExtraFields ?? []).length > 0;
  const [show2fa, setShow2fa] = useState(false);
  // Detected fields are required for this site, so open the section for them;
  // otherwise it's a rarely-needed manual fallback, kept collapsed.
  const [showExtra, setShowExtra] = useState(hasDetectedFields);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectCaptureFormData>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      username: '',
      password: '',
      totpSeed: '',
      extraFields: (initialExtraFields ?? []).map((field) => ({
        label: field.label,
        value: '',
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'extraFields' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-foreground">Your sign-in details</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We&apos;ll sign in for you now, and the scheduler reuses these so you never
          re-enter them. Stored encrypted in 1Password — never shared.
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

      {/* Two-factor — hidden until the user says this login uses it. */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={show2fa}
          onChange={(e) => setShow2fa(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        This login uses an authenticator app (2FA)
      </label>

      {show2fa && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="capture-totp">Authenticator setup key</Label>
          <Input
            id="capture-totp"
            placeholder="e.g. JBSW Y3DP EHPK 3PXP"
            {...register('totpSeed')}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            The long setup key shown <em>once</em> when you add the authenticator app
            (&ldquo;can&apos;t scan? enter this code&rdquo;) — <strong>not</strong> the
            rotating 6-digit code. We use it to generate codes at run time so scheduled
            runs don&apos;t need you.
          </p>
        </div>
      )}

      {/* Extra site fields (workspace, subdomain, …) — detected ones open here. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowExtra((open) => !open)}
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showExtra ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {hasDetectedFields ? 'This site needs a few more details' : 'Add a field this site needs'}
        </button>

        {showExtra && (
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Input
                  aria-label={`Field ${index + 1} name`}
                  placeholder="Field name (e.g. Workspace)"
                  {...register(`extraFields.${index}.label` as const)}
                />
                <Input
                  aria-label={`Field ${index + 1} value`}
                  placeholder="Value (e.g. acme)"
                  {...register(`extraFields.${index}.value` as const)}
                />
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={() => remove(index)}
                  className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Close size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ label: '', value: '' })}
              className="flex w-fit items-center gap-1.5 text-xs text-primary"
            >
              <Add size={12} />
              Add another field
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Locked size={12} className="shrink-0" />
        Encrypted · stored in 1Password
      </div>

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
