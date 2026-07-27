'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@trycompai/design-system';
import type { ReactNode } from 'react';

interface WizardFieldProps {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Shared question wrapper for wizard steps: a DS Field with a label, optional
 * helper description, the control, and an inline validation error. Built on the
 * design-system Field primitives so every question is spaced identically.
 */
export function WizardField({ label, helper, error, children }: WizardFieldProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {helper && <FieldDescription>{helper}</FieldDescription>}
      {children}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
