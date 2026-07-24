'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@trycompai/design-system';
import { Add, Close, Locked } from '@trycompai/design-system/icons';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { LoginAnalysis } from '../../hooks/types';
import { deriveCaptureFields } from './connect-capture-fields';

// Internal form shape — a flat list of the fields the vendor's page needs. It's
// mapped back to the sign-in contract (username/password/extraFields) on submit,
// so the runtime is unchanged.
const captureSchema = z.object({
  fields: z.array(
    z.object({
      label: z.string().trim().min(1, { message: 'Field name is required' }),
      value: z.string().min(1, { message: 'Required' }),
      kind: z.enum(['identifier', 'password', 'text']),
      editable: z.boolean(),
    }),
  ),
  use2fa: z.boolean(),
  totpSeed: z.string().trim().optional(),
});
type CaptureFormValues = z.infer<typeof captureSchema>;

/** What the sign-in flow consumes — unchanged so the runtime contract holds. */
export interface ConnectCaptureFormData {
  username: string;
  password: string;
  totpSeed?: string;
  extraFields?: { label: string; value: string }[];
  /** The vendor's own label for the identifier field, for a truthful sign-in step. */
  usernameLabel?: string;
}

interface ConnectCaptureFormProps {
  isSubmitting: boolean;
  onSubmit: (data: ConnectCaptureFormData) => void;
  /** Detection for this vendor's login — drives which fields we render (1A). */
  analysis?: LoginAnalysis | null;
  submitLabel?: string;
}

function placeholderFor(kind: CaptureFormValues['fields'][number]['kind']): string {
  if (kind === 'password') return '••••••••••••';
  return '';
}

export function ConnectCaptureForm({
  isSubmitting,
  onSubmit,
  analysis,
  submitLabel = 'Sign in for me',
}: ConnectCaptureFormProps) {
  const derived = useMemo(() => deriveCaptureFields(analysis), [analysis]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CaptureFormValues>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      fields: derived.fields.map((field) => ({
        label: field.label,
        value: '',
        kind: field.kind,
        editable: Boolean(field.editableLabel),
      })),
      use2fa: false,
      totpSeed: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });
  const use2fa = watch('use2fa');

  // Map the flat field list back to the sign-in contract the runtime expects.
  const submit = (values: CaptureFormValues) => {
    const identifier = values.fields.find((f) => f.kind === 'identifier');
    const password = values.fields.find((f) => f.kind === 'password');
    onSubmit({
      username: identifier?.value.trim() ?? '',
      password: password?.value ?? '',
      totpSeed: values.use2fa && values.totpSeed?.trim() ? values.totpSeed.trim() : undefined,
      extraFields: values.fields
        .filter((f) => f.kind === 'text')
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
      usernameLabel: identifier?.label.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-foreground">Your sign-in details</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          We&apos;ll sign in for you now, and the scheduler reuses these so you never
          re-enter them. Stored encrypted in 1Password — never shared.
        </p>
      </div>

      {derived.manual ? (
        <div
          className="rounded-md border px-3 py-2 text-[11.5px] leading-relaxed text-foreground"
          style={{
            borderColor: 'color-mix(in oklab, var(--warning) 35%, transparent)',
            background: 'color-mix(in oklab, var(--warning) 9%, transparent)',
          }}
        >
          We couldn&apos;t read this sign-in page. Add the fields it asks for, exactly as
          they appear.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
          Fields read from the vendor&apos;s sign-in page
        </div>
      )}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const kind = field.kind;
          const fieldId = `capture-field-${index}`;
          const valueError = errors.fields?.[index]?.value?.message;
          const labelError = errors.fields?.[index]?.label?.message;
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              {/* kind is fixed per field; keep it in the form data. */}
              <input type="hidden" {...register(`fields.${index}.kind` as const)} />
              {field.editable ? (
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Field ${index + 1} name`}
                    placeholder="Field name (e.g. Workspace)"
                    {...register(`fields.${index}.label` as const)}
                  />
                  <button
                    type="button"
                    aria-label="Remove field"
                    onClick={() => remove(index)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Close size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input type="hidden" {...register(`fields.${index}.label` as const)} />
                  <label
                    htmlFor={fieldId}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    {field.label}
                    {kind === 'password' && <Locked size={11} />}
                  </label>
                </>
              )}
              <Input
                id={field.editable ? undefined : fieldId}
                type={kind === 'password' ? 'password' : 'text'}
                autoComplete="off"
                placeholder={placeholderFor(kind)}
                {...register(`fields.${index}.value` as const)}
              />
              {(valueError || labelError) && (
                <p className="text-xs text-destructive">{labelError || valueError}</p>
              )}
            </div>
          );
        })}

        {derived.manual && (
          <button
            type="button"
            onClick={() => append({ label: '', value: '', kind: 'text', editable: true })}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Add size={12} />
            Add a field
          </button>
        )}
      </div>

      {/* Two-factor — hidden until the user says this login uses it. */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input type="checkbox" {...register('use2fa')} className="h-3.5 w-3.5 accent-primary" />
        This login uses an authenticator app (2FA)
      </label>

      {use2fa && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="capture-totp">Authenticator setup key</Label>
          <Input
            id="capture-totp"
            placeholder="e.g. JBSW Y3DP EHPK 3PXP"
            {...register('totpSeed')}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            The long setup key shown <em>once</em> when you add the authenticator app
            (&ldquo;can&apos;t scan? enter this code&rdquo;) — <strong>not</strong> the
            rotating 6-digit code. We use it to generate codes at run time so scheduled
            runs don&apos;t need you.
          </p>
        </div>
      )}

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
