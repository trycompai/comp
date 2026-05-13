'use client';

import { Label, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';

export function LabelRow({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <Label htmlFor={htmlFor}>
        <span>
          {children}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
      </Label>
      {hint && (
        <Text size="xs" variant="muted">
          {hint}
        </Text>
      )}
    </div>
  );
}

export function FormFooterInfo({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">
        <Information size={13} />
      </span>
      <Text size="xs" variant="muted">
        {children}
      </Text>
    </div>
  );
}

export function FormFooterRow({
  info,
  children,
  align = 'between',
}: {
  info?: ReactNode;
  children: ReactNode;
  align?: 'between' | 'end';
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        align === 'end' ? 'justify-end' : 'justify-between'
      }`}
    >
      {info ?? <span />}
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
