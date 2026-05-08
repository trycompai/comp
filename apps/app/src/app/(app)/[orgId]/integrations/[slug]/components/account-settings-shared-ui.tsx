'use client';

import { Label } from '@trycompai/design-system';
import type { ReactNode } from 'react';

export function AccountSettingsSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      {children}
    </div>
  );
}

export function AccountSettingsFieldGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs">
        <Label>{label}</Label>
      </div>
      {children}
    </div>
  );
}

export function AccountSettingsInfoRow({
  label,
  value,
  mono,
  badge,
  valueTruncate,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  badge?: ReactNode;
  valueTruncate?: boolean;
}) {
  return (
    <div
      className={
        valueTruncate
          ? 'flex justify-between items-center gap-2'
          : 'flex justify-between items-center'
      }
    >
      <span
        className={`text-[11px] text-muted-foreground ${valueTruncate ? 'shrink-0' : ''}`}
      >
        {label}
      </span>
      {badge ?? (
        <span
          className={`text-[11px] ${mono ? 'font-mono' : ''} ${valueTruncate ? 'truncate text-right' : ''}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
