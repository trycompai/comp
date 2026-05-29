'use client';

import { Text } from '@trycompai/design-system';
import type { ReactNode } from 'react';

interface WizardFieldProps {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Shared question wrapper for wizard steps: a bold label, optional helper text,
 * the control, and an inline validation error. Keeps each step component small.
 */
export function WizardField({ label, helper, error, children }: WizardFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Text size="base" weight="semibold">
        {label}
      </Text>
      {helper && (
        <div className="text-muted-foreground">
          <Text variant="muted">{helper}</Text>
        </div>
      )}
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
